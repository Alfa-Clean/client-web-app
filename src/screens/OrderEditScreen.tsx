import { useEffect, useState } from 'preact/hooks'
import { Info } from 'lucide-react'
import type { Order, AddonItem, OrderPatchPayload } from '../api/orders'
import { patchOrder } from '../api/orders'
import type { Addon, AddonCategory } from '../api/addons'
import { getAddons, getAddonCategories } from '../api/addons'
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

// ─── Date/Slot helpers (same as OrderScreen) ─────────────────────────────────

const TZ_OFFSET = 5

function nowInTashkent(): Date {
  const now = new Date()
  const utc = now.getTime() + now.getTimezoneOffset() * 60000
  return new Date(utc + TZ_OFFSET * 3600000)
}

const FIXED_SLOTS: Array<{ start: number; label: string }> = [
  { start: 9,  label: '09:00–12:00' },
  { start: 12, label: '12:00–15:00' },
  { start: 15, label: '15:00–18:00' },
]

function availableSlots(isoDate: string): string[] {
  const tz = nowInTashkent()
  const cutoff = new Date(tz.getTime() + 3 * 3600000)
  const [y, m, d] = isoDate.split('-').map(Number)
  return FIXED_SLOTS
    .filter(({ start }) => {
      const slotAbs = Date.UTC(y, m - 1, d, start - TZ_OFFSET, 0, 0)
      return slotAbs >= cutoff.getTime() - TZ_OFFSET * 3600000
    })
    .map(({ label }) => label)
}

type TFn = (key: string, params?: Record<string, string | number>) => string

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

// ─── AddonRow ─────────────────────────────────────────────────────────────────

interface AddonRowProps {
  addon: Addon
  qty: number
  lang: Lang
  onSetQty: (id: string, qty: number) => void
  onInfo: (addon: Addon) => void
}

function AddonRow({ addon, qty, lang, onSetQty, onInfo }: AddonRowProps) {
  const on = qty > 0
  const hasDescription = !!(addon.description_translations?.[lang] || addon.description_translations?.['ru'])
  return (
    <div class="w-full flex items-center justify-between px-4 py-3 gap-3">
      <div class="flex-1 min-w-0 flex items-center gap-1.5">
        <span class={`text-sm font-medium truncate ${on ? 'text-[#2D6126]' : 'text-gray-900'}`}>
          {addon.translations[lang] ?? addon.translations['ru'] ?? addon.id}
        </span>
        {hasDescription && (
          <button
            type="button"
            onClick={() => onInfo(addon)}
            class="shrink-0 w-5 h-5 flex items-center justify-center text-gray-400 active:text-gray-600 transition-colors"
          >
            <Info size={14} />
          </button>
        )}
      </div>
      <div class="flex items-center gap-2 shrink-0">
        {on ? (
          <>
            <span class="text-xs text-gray-400">+{(addon.price * qty).toLocaleString('ru-RU')}</span>
            <button
              type="button"
              onClick={() => onSetQty(addon.id, qty - 1)}
              class="w-7 h-7 rounded-full bg-gray-100 text-gray-700 text-base font-light flex items-center justify-center active:bg-gray-200 transition-colors"
            >−</button>
            <span class="text-sm font-semibold text-gray-900 w-5 text-center">{qty}</span>
            <button
              type="button"
              onClick={() => onSetQty(addon.id, qty + 1)}
              class="w-7 h-7 rounded-full bg-[#44973A] text-white text-base font-light flex items-center justify-center active:opacity-80 transition-colors"
            >+</button>
          </>
        ) : (
          <>
            <span class="text-xs text-gray-400">+{addon.price.toLocaleString('ru-RU')}</span>
            <button
              type="button"
              onClick={() => onSetQty(addon.id, 1)}
              class="w-7 h-7 rounded-full bg-gray-100 text-gray-500 text-base font-light flex items-center justify-center active:bg-gray-200 transition-colors"
            >+</button>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  order: Order
  telegramId: number
  onBack: () => void
  onSaved: (updated: Order) => void
}

// ─── Component ────────────────────────────────────────────────────────────────

export function OrderEditScreen({ order, telegramId, onBack, onSaved }: Props) {
  const { t, lang } = useLocale()
  const { exiting, handleBack } = useExitBack(onBack)
  const { confirm, dialogProps } = useConfirm()

  const isAssigned = order.status === 'assigned'

  const [date, setDate] = useState(order.order_date)
  const [slot, setSlot] = useState(order.order_slot)
  const [address, setAddress] = useState(order.address)
  const [addressLabel, setAddressLabel] = useState<string | null>(null)
  const [addons, setAddons] = useState<AddonItem[]>(
    order.addons.map(a => ({ id: a.id, qty: a.qty ?? 1 }))
  )

  const [addonsList, setAddonsList] = useState<Addon[]>([])
  const [addonCategories, setAddonCategories] = useState<AddonCategory[]>([])
  const [addonsOpen, setAddonsOpen] = useState(true)
  const [savedAddresses, setSavedAddresses] = useState<Address[]>([])
  const [showAddressDropdown, setShowAddressDropdown] = useState(false)

  const [showCalendar, setShowCalendar] = useState(false)
  const [infoAddon, setInfoAddon] = useState<Addon | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      getAddons().catch(() => []),
      getAddonCategories().catch(() => []),
      getAddresses(telegramId).catch(() => []),
    ]).then(([a, c, addrs]) => {
      setAddonsList(Array.isArray(a) ? a : [])
      setAddonCategories(Array.isArray(c) ? c : [])
      setSavedAddresses(Array.isArray(addrs) ? addrs : [])
    })
  }, [telegramId])

  async function handleAddressSelect(addr: Address) {
    const incomingHousingType = addr.housing_type ?? 'apt'
    if (incomingHousingType !== (order.housing_type ?? 'apt')) {
      setShowAddressDropdown(false)
      await confirm(t('edit_order_housing_change'), { confirmVariant: 'normal', cancelLabel: '' })
      return
    }
    setAddress(addr.address)
    setAddressLabel(addr.label ?? null)
    setShowAddressDropdown(false)
  }

  const days = next14Days(t)
  const todayISO = toISO(nowInTashkent())
  const tomorrowISO = (() => { const d = nowInTashkent(); d.setDate(d.getDate() + 1); return toISO(d) })()
  const slots = date ? availableSlots(date) : []

  const isToday    = date === todayISO
  const isTomorrow = date === tomorrowISO
  const isOther    = date && !isToday && !isTomorrow

  const availableDates = new Set(days.map(d => d.iso))

  function handleDateChip(iso: string) {
    setDate(iso)
    const next = availableSlots(iso)
    if (slot && !next.includes(slot)) setSlot(next[0] ?? '')
  }

  function handleCalendarSelect(iso: string) {
    setShowCalendar(false)
    handleDateChip(iso)
  }

  function setAddonQty(id: string, qty: number) {
    if (qty <= 0) {
      setAddons(prev => prev.filter(x => x.id !== id))
    } else {
      setAddons(prev => {
        const existing = prev.find(x => x.id === id)
        if (existing) return prev.map(x => x.id === id ? { ...x, qty } : x)
        return [...prev, { id, qty }]
      })
    }
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      const payload: OrderPatchPayload = { addons }
      if (!isAssigned) {
        if (date !== order.order_date) payload.order_date = date
        if (slot !== order.order_slot) payload.order_slot = slot
        if (address.trim() !== order.address) payload.address = address.trim()
      }
      const updated = await patchOrder(order.id, payload)
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

  const uncategorized = addonsList.filter(a => !a.category_id)
  const groups = addonCategories
    .map(cat => ({ category: cat, items: addonsList.filter(a => a.category_id === cat.id) }))
    .filter(g => g.items.length > 0)

  const hasAddons = addonsList.length > 0 && order.service_type !== 'general'

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
          onSelect={handleCalendarSelect}
          onClose={() => setShowCalendar(false)}
        />
      )}

    <div class={`min-h-screen bg-gray-50 flex flex-col ${exiting ? 'animate-slide-out-right' : 'animate-slide-in-right'}`}>

      {/* Addon info sheet */}
      <BottomSheet open={!!infoAddon} onClose={() => setInfoAddon(null)}>
        {infoAddon && (
          <div class="px-5 pt-2 pb-6">
            <p class="text-base font-semibold text-gray-900 mb-3">
              {infoAddon.translations[lang] ?? infoAddon.translations['ru'] ?? infoAddon.id}
            </p>
            <p class="text-sm text-gray-600 leading-relaxed mb-5">
              {infoAddon.description_translations[lang] ?? infoAddon.description_translations['ru']}
            </p>
            <button
              type="button"
              onClick={() => setInfoAddon(null)}
              class="w-full py-3.5 rounded-2xl text-sm font-semibold text-white"
              style="background:#44973A"
            >
              {t('dialog_ok')}
            </button>
          </div>
        )}
      </BottomSheet>

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

        {/* Date & time — only for 'new' */}
        {!isAssigned && (
          <div class="bg-white rounded-2xl border border-gray-100 px-4 py-4 flex flex-col gap-3">
            <p class="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
              {t('edit_order_date_label')}
            </p>

            {/* Date chips */}
            <div class="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleDateChip(todayISO)}
                class={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  isToday ? 'bg-[#44973A] text-white' : 'bg-gray-100 text-gray-700'
                }`}
              >
                {t('today')}
              </button>
              <button
                type="button"
                onClick={() => handleDateChip(tomorrowISO)}
                class={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  isTomorrow ? 'bg-[#44973A] text-white' : 'bg-gray-100 text-gray-700'
                }`}
              >
                {t('tomorrow')}
              </button>
              <button
                type="button"
                onClick={() => setShowCalendar(true)}
                class={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  isOther ? 'bg-[#44973A] text-white' : 'bg-gray-100 text-gray-700'
                }`}
              >
                {isOther ? formatShortDate(date, lang) : t('date_pick_other')}
              </button>
            </div>

            {/* Slot chips */}
            {date && slots.length > 0 && (
              <div class="flex flex-wrap gap-2 pt-1">
                {slots.map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSlot(s)}
                    class={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                      slot === s ? 'bg-[#44973A] text-white' : 'bg-gray-100 text-gray-700'
                    }`}
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

        {/* Address — only for 'new' */}
        {!isAssigned && (
          <div class="relative">
            <button
              type="button"
              onClick={() => setShowAddressDropdown(v => !v)}
              class={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl border-2 bg-white text-left transition-colors ${
                showAddressDropdown ? 'border-[#44973A]' : 'border-gray-200'
              }`}
            >
              <div class="flex-1 min-w-0">
                {address ? (
                  <>
                    <p class="text-sm font-medium text-gray-900 truncate">{addressLabel || address}</p>
                    {addressLabel && <p class="text-xs text-gray-400 mt-0.5 truncate">{address}</p>}
                  </>
                ) : (
                  <p class="text-sm text-gray-400">{t('edit_order_address_label')}</p>
                )}
              </div>
              <svg
                width="16" height="16" viewBox="0 0 16 16" fill="none"
                class={`shrink-0 ml-2 text-gray-400 transition-transform ${showAddressDropdown ? 'rotate-180' : ''}`}
              >
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
                      active={address === addr.address}
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

        {/* Addons */}
        {hasAddons && (
          <div class="bg-[#F0F9EE] rounded-2xl border border-[#c8e6c0] overflow-hidden">
            <button
              type="button"
              onClick={() => setAddonsOpen(v => !v)}
              class="w-full flex items-center justify-between px-4 py-3.5 text-left active:bg-[#e4f4df] transition-colors"
            >
              <div class="flex items-center gap-2">
                <span class="text-sm font-medium text-[#2D6126]">{t('edit_order_addons_label')}</span>
                {addons.length > 0 && (
                  <span class="text-xs font-semibold text-white bg-[#44973A] rounded-full w-5 h-5 flex items-center justify-center">
                    {addons.length}
                  </span>
                )}
              </div>
              <svg
                width="20" height="20" viewBox="0 0 20 20" fill="none"
                class={`shrink-0 text-[#44973A] transition-transform ${addonsOpen ? 'rotate-45' : ''}`}
              >
                <path d="M10 4v12M4 10h12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
              </svg>
            </button>

            <div class={`grid transition-all duration-300 ease-in-out ${addonsOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
              <div class="overflow-hidden">
                <div class="border-t border-[#c8e6c0] bg-white flex flex-col gap-4 py-4">
                  {groups.map(({ category, items }) => (
                    <div key={category.id}>
                      <div class="px-4">
                        <p class="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-3">
                          {category.translations[lang] ?? category.translations['ru'] ?? category.id}
                        </p>
                      </div>
                      <div class="divide-y divide-gray-50">
                        {items.map(addon => <AddonRow key={addon.id} addon={addon} qty={addons.find(x => x.id === addon.id)?.qty ?? 0} lang={lang} onSetQty={setAddonQty} onInfo={setInfoAddon} />)}
                      </div>
                    </div>
                  ))}
                  {uncategorized.length > 0 && (
                    <div>
                      <div class="divide-y divide-gray-50">
                        {uncategorized.map(addon => <AddonRow key={addon.id} addon={addon} qty={addons.find(x => x.id === addon.id)?.qty ?? 0} lang={lang} onSetQty={setAddonQty} onInfo={setInfoAddon} />)}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Bottom bar */}
      <div class="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-4 flex flex-col gap-2">
        {error && (
          <p class="text-xs text-red-500 text-center">{error}</p>
        )}
        <button
          type="button"
          disabled={saving || (!isAssigned && (!date || !slot))}
          onClick={handleSave}
          class="w-full bg-[#44973A] disabled:opacity-50 text-white font-semibold py-4 rounded-2xl transition-all active:scale-95 text-sm"
        >
          {saving ? t('edit_order_saving') : t('edit_order_save')}
        </button>
      </div>
    </div>
    </>
  )
}
