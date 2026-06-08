import { useEffect, useState } from 'preact/hooks'
import type { HandymanOrder, WorkItem } from '../api/orders'
import { patchHandymanOrder } from '../api/orders'
import { getHandymanWorks, getHandymanWorkCategories } from '../api/addons'
import type { HandymanWork, HandymanWorkCategory } from '../api/addons'
import type { Address } from '../api/addresses'
import { getAddresses } from '../api/addresses'
import { ApiError } from '../api/client'
import { useLocale } from '../i18n'
import type { Lang } from '../i18n/locales'
import { CalendarPicker } from '../components/CalendarPicker'
import { BottomSheet } from '../components/BottomSheet'
import { AddressOption } from '../components/AddressOption'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { useConfirm } from '../hooks/useConfirm'
import { useExitBack } from '../hooks/useExitBack'

const TZ_OFFSET = 5

function nowInTashkent(): Date {
  const now = new Date()
  const utc = now.getTime() + now.getTimezoneOffset() * 60000
  return new Date(utc + TZ_OFFSET * 3600000)
}

const FIXED_SLOTS = [
  { start: 9,  label: '09:00–12:00' },
  { start: 12, label: '12:00–15:00' },
  { start: 15, label: '15:00–18:00' },
]

function availableSlots(isoDate: string): string[] {
  const tz = nowInTashkent()
  const cutoff = new Date(tz.getTime() + 3 * 3600000)
  const [y, m, d] = isoDate.split('-').map(Number)
  return FIXED_SLOTS
    .filter(({ start }) => Date.UTC(y, m - 1, d, start - TZ_OFFSET, 0, 0) >= cutoff.getTime() - TZ_OFFSET * 3600000)
    .map(({ label }) => label)
}

type TFn = (key: string) => string

function next14Days(t: TFn): Array<{ iso: string; label: string }> {
  const tz = nowInTashkent()
  const result: Array<{ iso: string; label: string }> = []
  const days = t('days').split(',')
  const months = t('months').split(',')
  for (let i = 0; i < 14; i++) {
    const d = new Date(tz)
    d.setDate(d.getDate() + i)
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    if (availableSlots(iso).length === 0) continue
    let label: string
    if (i === 0) label = t('today')
    else if (i === 1) label = t('tomorrow')
    else label = `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]}`
    result.push({ iso, label })
  }
  return result
}

function toISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const LOCALE_MAP: Record<Lang, string> = { ru: 'ru-RU', uz: 'uz-UZ', en: 'en-US' }

function formatShortDate(iso: string, lang: Lang): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Intl.DateTimeFormat(LOCALE_MAP[lang], { day: 'numeric', month: 'short' }).format(new Date(y, m - 1, d))
}

interface Props {
  order: HandymanOrder
  telegramId: number
  onBack: () => void
  onSaved: (updated: HandymanOrder) => void
}

export function HandymanOrderEditScreen({ order, telegramId, onBack, onSaved }: Props) {
  const { t, lang } = useLocale()
  const { exiting, handleBack } = useExitBack(onBack)
  const { confirm, dialogProps } = useConfirm()

  const isAssigned = order.status === 'assigned'

  const [date, setDate] = useState(order.order_date)
  const [slot, setSlot] = useState(order.order_slot)
  const [addressId, setAddressId] = useState(order.address_id ?? '')
  const [addressDisplay, setAddressDisplay] = useState(order.address)
  const [addressLabel, setAddressLabel] = useState<string | null>(null)
  const [description, setDescription] = useState(order.description ?? '')
  const [selectedWorks, setSelectedWorks] = useState<WorkItem[]>(
    order.works?.map(w => ({ id: w.work_id, qty: w.qty ?? 1 })) ?? []
  )

  const [worksList, setWorksList] = useState<HandymanWork[]>([])
  const [workCategories, setWorkCategories] = useState<HandymanWorkCategory[]>([])
  const [savedAddresses, setSavedAddresses] = useState<Address[]>([])
  const [showCalendar, setShowCalendar] = useState(false)
  const [showAddressDropdown, setShowAddressDropdown] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getHandymanWorks().catch(() => []).then(w => setWorksList(Array.isArray(w) ? w : []))
    getHandymanWorkCategories().catch(() => []).then(c => setWorkCategories(Array.isArray(c) ? c : []))
    getAddresses(telegramId).catch(() => []).then(a => {
      const list = Array.isArray(a) ? a : []
      setSavedAddresses(list)
      if (order.address_id) {
        const matched = list.find(addr => addr.id === order.address_id)
        if (matched?.label) setAddressLabel(matched.label)
      }
    })
  }, [telegramId])

  async function handleAddressSelect(addr: Address) {
    setAddressId(addr.id)
    setAddressDisplay(addr.address)
    setAddressLabel(addr.label ?? null)
    setShowAddressDropdown(false)
  }

  const tz = nowInTashkent()
  const todayISO = toISO(tz)
  const tomorrowISO = toISO(new Date(tz.getTime() + 86400000))
  const days = next14Days(t)
  const availableDates = new Set(days.map(d => d.iso))
  const slots = date ? availableSlots(date) : []
  const isToday = date === todayISO
  const isTomorrow = date === tomorrowISO
  const isOther = !!date && !isToday && !isTomorrow

  function handleDateChip(iso: string) {
    setDate(iso)
    const next = availableSlots(iso)
    if (slot && !next.includes(slot)) setSlot(next[0] ?? '')
  }

  function setWorkQty(id: string, qty: number) {
    setSelectedWorks(prev => {
      if (qty <= 0) return prev.filter(w => w.id !== id)
      const exists = prev.find(w => w.id === id)
      if (exists) return prev.map(w => w.id === id ? { ...w, qty } : w)
      return [...prev, { id, qty }]
    })
  }

  const localPrice = selectedWorks.reduce((s, { id, qty }) => {
    const work = worksList.find(w => w.id === id)
    return s + (work ? work.price * qty : 0)
  }, 0) + 50000

  async function handleSave() {
    if (selectedWorks.length === 0) return
    setSaving(true)
    setError(null)
    try {
      const payload: Parameters<typeof patchHandymanOrder>[1] = {}
      if (!isAssigned) {
        if (date !== order.order_date) payload.order_date = date
        if (slot !== order.order_slot) payload.order_slot = slot
        if (addressId && addressId !== (order.address_id ?? '')) payload.address_id = addressId
      }
      if (description.trim() !== (order.description ?? '')) payload.description = description.trim()
      const currentWorks = order.works?.map(w => `${w.work_id}:${w.qty ?? 1}`).sort().join(',') ?? ''
      const newWorks = [...selectedWorks].map(w => `${w.id}:${w.qty}`).sort().join(',')
      if (newWorks !== currentWorks) payload.works = selectedWorks
      if (Object.keys(payload).length === 0) { onBack(); return }
      const updated = await patchHandymanOrder(order.id, payload)
      onSaved(updated)
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setError(t('edit_order_conflict'))
      } else {
        setError(t('err_save'))
      }
      setSaving(false)
    }
  }

  return (
    <>
      <ConfirmDialog
        {...dialogProps}
        confirmLabel={t('dialog_ok')}
        cancelLabel={dialogProps.cancelLabel ?? ''}
        confirmVariant="green"
      />

      {showCalendar && (
        <CalendarPicker
          availableDates={availableDates}
          value={date}
          lang={lang}
          cancelLabel={t('dialog_cancel')}
          onSelect={iso => { setDate(iso); const n = availableSlots(iso); if (slot && !n.includes(slot)) setSlot(n[0] ?? ''); setShowCalendar(false) }}
          onClose={() => setShowCalendar(false)}
        />
      )}

      <div class={`min-h-screen bg-gray-50 flex flex-col ${exiting ? 'animate-slide-out-right' : 'animate-slide-in-right'}`}>

        {/* Header */}
        <div class="bg-white px-4 pt-12 pb-4 flex items-center gap-3 border-b border-gray-100 shrink-0">
          <button
            type="button"
            onClick={handleBack}
            class="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 active:bg-gray-200 transition-colors text-gray-700 text-xl shrink-0"
          >
            ‹
          </button>
          <div class="flex-1 absolute inset-x-0 text-center pointer-events-none">
            <p class="text-base font-semibold text-gray-900">{t('edit_order_title')}</p>
          </div>
        </div>

        <div class="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4 pb-32">

          {/* Assigned hint */}
          {isAssigned && (
            <div class="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
              <p class="text-sm text-amber-800">{t('edit_order_assigned_hint')}</p>
            </div>
          )}

          {/* Date & slot */}
          {!isAssigned && (
            <div class="bg-white rounded-2xl border border-gray-100 px-4 py-4 flex flex-col gap-3">
              <p class="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                {t('edit_order_date_label')}
              </p>
              <div class="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleDateChip(todayISO)}
                  class={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${isToday ? 'bg-[#44973A] text-white' : 'bg-gray-100 text-gray-700'}`}
                >
                  {t('today')}
                </button>
                <button
                  type="button"
                  onClick={() => handleDateChip(tomorrowISO)}
                  class={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${isTomorrow ? 'bg-[#44973A] text-white' : 'bg-gray-100 text-gray-700'}`}
                >
                  {t('tomorrow')}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCalendar(true)}
                  class={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${isOther ? 'bg-[#44973A] text-white' : 'bg-gray-100 text-gray-700'}`}
                >
                  {isOther ? formatShortDate(date, lang) : t('date_pick_other')}
                </button>
              </div>
              {date && slots.length > 0 && (
                <div class="flex flex-wrap gap-2 pt-1">
                  {slots.map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSlot(s)}
                      class={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${slot === s ? 'bg-[#44973A] text-white' : 'bg-gray-100 text-gray-700'}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
              {date && slots.length === 0 && (
                <p class="text-xs text-gray-400">{t('no_slots')}</p>
              )}
            </div>
          )}

          {/* Address */}
          {!isAssigned && (
            <div class="relative">
              <button
                type="button"
                onClick={() => setShowAddressDropdown(v => !v)}
                class={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl border-2 bg-white text-left transition-colors ${showAddressDropdown ? 'border-gray-300' : 'border-gray-200'}`}
              >
                <div class="flex-1 min-w-0">
                  {addressDisplay ? (
                    <>
                      <p class="text-sm font-medium text-gray-900 truncate">{addressLabel || addressDisplay}</p>
                      {addressLabel && <p class="text-xs text-gray-400 mt-0.5 truncate">{addressDisplay}</p>}
                    </>
                  ) : (
                    <p class="text-sm text-gray-400">{t('edit_order_address_label')}</p>
                  )}
                </div>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" class={`shrink-0 ml-2 text-gray-400 transition-transform ${showAddressDropdown ? 'rotate-180' : ''}`}>
                  <path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </button>
              {showAddressDropdown && (
                <>
                  <div class="fixed inset-0 z-10" onClick={() => setShowAddressDropdown(false)} />
                  <div class="absolute left-0 right-0 top-[calc(100%+6px)] z-20 bg-white rounded-2xl border border-gray-100 shadow-lg overflow-hidden">
                    {savedAddresses.slice(0, 5).map(addr => (
                      <AddressOption
                        key={addr.id}
                        address={addr.address}
                        label={addr.label}
                        housingType={addr.housing_type ?? 'apt'}
                        active={addressId === addr.id}
                        onClick={() => handleAddressSelect(addr)}
                      />
                    ))}
                    {savedAddresses.length === 0 && (
                      <p class="text-sm text-gray-400 px-4 py-3">{t('home_no_addresses')}</p>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Description */}
          <div class="bg-white rounded-2xl border border-gray-100 px-4 py-4">
            <p class="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-2">
              {t('handyman_comment_label')}
            </p>
            <textarea
              rows={3}
              value={description}
              onInput={e => setDescription((e.target as HTMLTextAreaElement).value)}
              placeholder={t('handyman_comment_placeholder')}
              class="w-full text-sm text-gray-900 placeholder-gray-400 focus:outline-none resize-none bg-transparent"
            />
          </div>

          {/* Works */}
          {worksList.length > 0 && (() => {
            const uncategorized = worksList.filter(w => !w.category_id)
            const groups: Array<{ category: HandymanWorkCategory; items: HandymanWork[] }> = workCategories
              .map(cat => ({ category: cat, items: worksList.filter(w => w.category_id === cat.id) }))
              .filter(g => g.items.length > 0)

            function WorkRow({ work }: { work: HandymanWork }) {
              const qty = selectedWorks.find(w => w.id === work.id)?.qty ?? 0
              const on = qty > 0
              return (
                <div class="flex items-center px-4 py-3 gap-2">
                  <p
                    class={`flex-1 text-sm font-medium cursor-pointer ${on ? 'text-[#2D6126]' : 'text-gray-900'}`}
                    onClick={() => setWorkQty(work.id, on ? 0 : 1)}
                  >
                    {work.translations[lang] ?? work.translations['ru'] ?? work.id}
                  </p>
                  <div class="flex items-center gap-2 shrink-0">
                    <span class="text-xs text-gray-400">+{work.price.toLocaleString('ru-RU')}</span>
                    {on ? (
                      <div class="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setWorkQty(work.id, qty - 1)}
                          class="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 text-sm font-bold leading-none active:bg-gray-200 transition-colors"
                        >
                          –
                        </button>
                        <span class="text-sm font-semibold text-gray-900 w-5 text-center">{qty}</span>
                        <button
                          type="button"
                          onClick={() => setWorkQty(work.id, qty + 1)}
                          class="w-6 h-6 rounded-full bg-[#44973A] flex items-center justify-center text-white text-sm font-bold leading-none active:bg-[#2D6126] transition-colors"
                        >
                          +
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setWorkQty(work.id, 1)}
                        class="w-5 h-5 rounded-md border-2 border-gray-300 flex items-center justify-center transition-colors"
                      />
                    )}
                  </div>
                </div>
              )
            }

            return (
              <div class="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                {groups.map(({ category, items }, gi) => (
                  <div key={category.id}>
                    {(gi > 0 || uncategorized.length > 0) && <div class="h-px bg-gray-100" />}
                    <p class="text-[10px] font-semibold uppercase tracking-widest text-gray-400 px-4 pt-3 pb-1">
                      {category.translations[lang] ?? category.translations['ru'] ?? category.id}
                    </p>
                    <div class="divide-y divide-gray-50">
                      {items.map(work => <WorkRow key={work.id} work={work} />)}
                    </div>
                  </div>
                ))}
                {uncategorized.length > 0 && (
                  <div>
                    {groups.length > 0 && <div class="h-px bg-gray-100" />}
                    <div class="divide-y divide-gray-50">
                      {uncategorized.map(work => <WorkRow key={work.id} work={work} />)}
                    </div>
                  </div>
                )}
              </div>
            )
          })()}

          {error && <p class="text-xs text-red-500 text-center">{error}</p>}

        </div>

        {/* Bottom bar */}
        <div class="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-4">
          <button
            type="button"
            disabled={saving || selectedWorks.length === 0 || (!isAssigned && (!date || !slot))}
            onClick={handleSave}
            class="w-full bg-[#44973A] disabled:opacity-50 text-white font-semibold py-4 rounded-2xl transition-all active:scale-95 text-sm"
          >
            {saving
              ? t('edit_order_saving')
              : `${t('edit_order_save')} · ${localPrice.toLocaleString('ru-RU')} сум`
            }
          </button>
        </div>
      </div>
    </>
  )
}
