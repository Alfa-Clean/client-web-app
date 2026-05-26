import { useEffect, useState } from 'preact/hooks'
import type { User } from '../types'
import type { Address } from '../api/addresses'
import { createAddress, getAddresses } from '../api/addresses'
import type { Addon } from '../api/addons'
import { getAddons } from '../api/addons'
import { createOrder } from '../api/orders'
import { useLocale } from '../i18n'
import type { Lang } from '../i18n/locales'
import { CalendarPicker } from '../components/CalendarPicker'
import { BottomSheet } from '../components/BottomSheet'
import { AddressOption } from '../components/AddressOption'
import { AddressFormScreen } from './AddressFormScreen'

// ─── Types ────────────────────────────────────────────────────────────────────

type ServiceType = 'standard' | 'general'
type HousingType = 'apt' | 'house'

interface Draft {
  serviceType: ServiceType
  housingType: HousingType
  address: string
  addressDetails: string
  rooms: number
  bathrooms: number
  totalRooms?: number
  totalBathrooms?: number
  orderDate: string
  orderSlot: string
  addons: string[]
  comment: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TZ_OFFSET = 5
const DRAFT_KEY = 'alfaclean_order_draft'

const EMPTY_DRAFT: Draft = {
  serviceType: 'standard',
  housingType: 'apt',
  address: '',
  addressDetails: '',
  rooms: 1,
  bathrooms: 1,
  orderDate: '',
  orderSlot: '',
  addons: [],
  comment: '',
}

// ─── Pricing ──────────────────────────────────────────────────────────────────

function calcPrice(
  serviceType: ServiceType,
  rooms: number,
  bathrooms: number,
  addonsList: Addon[],
  selectedAddons: string[],
): number {
  const base: Record<ServiceType, number> = { standard: 100000, general: 150000 }
  const perRoom: Record<ServiceType, number> = { standard: 30000, general: 50000 }
  const perBath: Record<ServiceType, number> = { standard: 20000, general: 30000 }
  const addonsTotal = addonsList
    .filter(a => selectedAddons.includes(a.id))
    .reduce((s, a) => s + a.price, 0)
  return base[serviceType] + perRoom[serviceType] * rooms + perBath[serviceType] * bathrooms + addonsTotal
}

function fmtPrice(p: number): string {
  return p.toLocaleString('ru-RU') + ' сум'
}

// ─── Date / Slot helpers ──────────────────────────────────────────────────────

type TFn = (key: string, params?: Record<string, string | number>) => string

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

// ─── Draft persistence ────────────────────────────────────────────────────────

function loadSavedDraft(): Draft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed?.draft ?? null
  } catch {
    return null
  }
}

function saveDraft(draft: Draft) {
  localStorage.setItem(DRAFT_KEY, JSON.stringify({ draft }))
}

function clearDraft() {
  localStorage.removeItem(DRAFT_KEY)
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: string }) {
  return (
    <p class="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-3">
      {children}
    </p>
  )
}

function Chip({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      class={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
        active
          ? 'bg-[#44973A] text-white'
          : 'bg-gray-100 text-gray-700 active:bg-gray-200'
      }`}
    >
      {label}
    </button>
  )
}

function Counter({
  value,
  min,
  max,
  onChange,
}: {
  value: number
  min: number
  max: number
  onChange: (v: number) => void
}) {
  return (
    <div class="flex items-center gap-4">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        class="w-9 h-9 rounded-full bg-gray-100 text-gray-700 text-xl font-light disabled:opacity-30 active:bg-gray-200 transition-colors flex items-center justify-center"
      >
        −
      </button>
      <span class="text-lg font-semibold text-gray-900 w-6 text-center">{value}</span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        class="w-9 h-9 rounded-full bg-gray-100 text-gray-700 text-xl font-light disabled:opacity-30 active:bg-gray-200 transition-colors flex items-center justify-center"
      >
        +
      </button>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  user: User
  onBack: () => void
}

export function OrderScreen({ user, onBack }: Props) {
  const { t, lang } = useLocale()
  const [draft, setDraft] = useState<Draft>(loadSavedDraft() ?? EMPTY_DRAFT)
  const [addons, setAddons] = useState<Addon[]>([])
  const [savedAddresses, setSavedAddresses] = useState<Address[]>([
    { id: 'mock1', address: 'Карасу-2, д. 39', notes: 'подъезд 3, эт. 5, кв. 12', housing_type: 'apt', rooms: 3, bathrooms: 1 },
    { id: 'mock2', address: 'ул. Насирходжа, 72', notes: 'домофон 47', housing_type: 'apt', rooms: 2, bathrooms: 1 },
  ])
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [showCalendar, setShowCalendar] = useState(false)
  const [showAddressSheet, setShowAddressSheet] = useState(false)
  const [showAddressDropdown, setShowAddressDropdown] = useState(false)
  const [infoSheet, setInfoSheet] = useState<ServiceType | null>(null)
  const [done, setDone] = useState(false)

  useEffect(() => {
    getAddons().catch(() => []).then(a => setAddons(Array.isArray(a) ? a : []))
    getAddresses(user.telegram_id).catch(() => []).then(a => setSavedAddresses(Array.isArray(a) ? a : []))
  }, [user.telegram_id])

  function patch(fields: Partial<Draft>) {
    setDraft(prev => {
      const next = { ...prev, ...fields }
      saveDraft(next)
      return next
    })
  }

  async function handleAddressCreated(data: Parameters<typeof createAddress>[1]) {
    const newAddr = await createAddress(user.telegram_id, data)
    const updated = await getAddresses(user.telegram_id).catch(() => savedAddresses)
    setSavedAddresses(Array.isArray(updated) ? updated : savedAddresses)
    patch({
      address: newAddr.address,
      addressDetails: newAddr.notes ?? '',
      totalRooms: newAddr.rooms ?? undefined,
      totalBathrooms: newAddr.bathrooms ?? undefined,
      housingType: newAddr.housing_type ?? 'apt',
    })
    setShowAddressSheet(false)
  }

  const isApt = draft.housingType === 'apt'
  const price = calcPrice(draft.serviceType, draft.rooms, draft.bathrooms, addons, draft.addons)

  const tz = nowInTashkent()
  const todayIso = toISO(tz)
  const tomorrowIso = toISO(new Date(tz.getTime() + 86400000))
  const days = next14Days(t)
  const availableSet = new Set(days.map(d => d.iso))
  const slots = draft.orderDate ? availableSlots(draft.orderDate) : []
  const isOtherDate = !!draft.orderDate && draft.orderDate !== todayIso && draft.orderDate !== tomorrowIso

  const canSubmit = draft.address.trim() !== '' && !!draft.orderDate && !!draft.orderSlot

  async function handleSubmit() {
    if (!canSubmit || submitting) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      const address = draft.addressDetails
        ? `${draft.address}, ${draft.addressDetails}`
        : draft.address
      await createOrder({
        telegram_id: user.telegram_id,
        phone: user.phone,
        service_type: draft.serviceType,
        rooms: draft.rooms,
        bathrooms: draft.bathrooms,
        price,
        address,
        order_date: draft.orderDate,
        order_slot: draft.orderSlot,
        source: 'bot',
        addons: draft.addons,
        ...(draft.comment.trim() && { comment: draft.comment.trim() }),
      })
      clearDraft()
      setDone(true)
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : t('confirm_error'))
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return <DoneScreen onBack={onBack} t={t} />
  }

  return (
    <div class="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div class="bg-white px-5 pt-12 pb-4 flex items-center justify-between border-b border-gray-100">
        <button
          type="button"
          onClick={onBack}
          class="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 text-lg font-light active:bg-gray-200 transition-colors"
        >
          ‹
        </button>
        <h1 class="text-base font-bold text-gray-900">Новый заказ</h1>
        <div class="w-9" />
      </div>

      {showCalendar && (
        <CalendarPicker
          availableDates={availableSet}
          value={draft.orderDate}
          lang={lang}
          cancelLabel={t('dialog_cancel')}
          onSelect={iso => { patch({ orderDate: iso, orderSlot: '' }); setShowCalendar(false) }}
          onClose={() => setShowCalendar(false)}
        />
      )}

      {/* Scrollable form */}
      <div class="flex-1 overflow-y-auto px-4 py-6 flex flex-col gap-6">

        {/* Адрес */}
        <div class="relative">
          {/* Trigger */}
          <button
            type="button"
            onClick={() => setShowAddressDropdown(v => !v)}
            class={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl border-2 bg-white text-left transition-colors ${
              showAddressDropdown
                ? 'border-[#44973A]'
                : draft.address
                  ? 'border-[#44973A] bg-[#F0F9EE] dark:bg-[#1a3a2a]'
                  : 'border-gray-200'
            }`}
          >
            <div class="flex-1 min-w-0">
              {draft.address ? (
                <>
                  <p class="text-sm font-medium text-[#2D6126] dark:text-[#6DB363] truncate">{draft.address}</p>
                  {draft.addressDetails && (
                    <p class="text-xs text-gray-400 mt-0.5 truncate">{draft.addressDetails}</p>
                  )}
                </>
              ) : (
                <p class="text-sm text-gray-400">{t('step_address')}</p>
              )}
            </div>
            <svg
              width="16" height="16" viewBox="0 0 16 16" fill="none"
              class={`shrink-0 ml-2 text-gray-400 transition-transform ${showAddressDropdown ? 'rotate-180' : ''}`}
            >
              <path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>

          {/* Dropdown */}
          {showAddressDropdown && (
            <>
              <div
                class="fixed inset-0 z-10"
                onClick={() => setShowAddressDropdown(false)}
              />
              <div class="absolute left-0 right-0 top-[calc(100%+6px)] z-20 bg-white rounded-2xl border border-gray-100 shadow-lg overflow-hidden">
                {savedAddresses.slice(0, 5).map(addr => (
                  <AddressOption
                    key={addr.id}
                    address={addr.address}
                    label={addr.label}
                    housingType={addr.housing_type ?? 'apt'}
                    active={draft.address === addr.address}
                    onClick={() => {
                      patch({
                        address: addr.address,
                        addressDetails: addr.notes ?? '',
                        totalRooms: addr.rooms ?? undefined,
                        totalBathrooms: addr.bathrooms ?? undefined,
                        housingType: addr.housing_type ?? draft.housingType,
                      })
                      setShowAddressDropdown(false)
                    }}
                  />
                ))}

                {/* Создать новый адрес */}
                <button
                  type="button"
                  onClick={() => {
                    setShowAddressDropdown(false)
                    setShowAddressSheet(true)
                  }}
                  class="w-full flex items-center gap-3 px-4 py-3 text-left active:bg-gray-50 transition-colors border-t border-gray-100"
                >
                  <div class="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center shrink-0 text-gray-500 text-sm font-light">
                    +
                  </div>
                  <p class="text-sm font-medium text-gray-500">{t('order_add_other')}</p>
                </button>
              </div>
            </>
          )}
        </div>

        {/* Тип уборки */}
        <div>
          <div class="flex gap-2">
            {(['standard', 'general'] as ServiceType[]).map(type => (
              <button
                key={type}
                type="button"
                onClick={() => patch({ serviceType: type })}
                class={`flex-1 relative py-3 px-4 rounded-2xl border-2 text-left transition-colors ${
                  draft.serviceType === type
                    ? 'border-[#44973A] bg-[#F0F9EE]'
                    : 'border-gray-200 bg-white'
                }`}
              >
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); setInfoSheet(type) }}
                  class="absolute top-2.5 right-2.5 text-gray-300 hover:text-gray-500 transition-colors"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.5"/>
                    <path d="M8 7v5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                    <circle cx="8" cy="4.5" r="0.75" fill="currentColor"/>
                  </svg>
                </button>
                <p class={`text-sm font-semibold pr-5 ${draft.serviceType === type ? 'text-[#2D6126]' : 'text-gray-900'}`}>
                  {t(`svc_${type}`)}
                </p>
                <p class="text-xs text-gray-400 mt-0.5">{t(`svc_${type}_desc`)}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Комнаты + санузлы (только квартира) */}
        {isApt && (
          <div>
            <div class="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
              <div class="flex items-center justify-between px-4 py-3.5">
                <p class="text-sm font-medium text-gray-700">{t('rooms_question')}</p>
                <Counter
                  value={draft.rooms}
                  min={1}
                  max={draft.totalRooms ?? 10}
                  onChange={v => patch({ rooms: v })}
                />
              </div>
            </div>
          </div>
        )}

        {/* Дата и время */}
        <div>
          <SectionLabel>Дата и время</SectionLabel>
          <div class="flex gap-2 mb-3">
            {availableSet.has(todayIso) && (
              <Chip
                label={t('today')}
                active={draft.orderDate === todayIso}
                onClick={() => patch({ orderDate: todayIso, orderSlot: '' })}
              />
            )}
            {availableSet.has(tomorrowIso) && (
              <Chip
                label={t('tomorrow')}
                active={draft.orderDate === tomorrowIso}
                onClick={() => patch({ orderDate: tomorrowIso, orderSlot: '' })}
              />
            )}
            <Chip
              label={isOtherDate ? formatShortDate(draft.orderDate, lang) : t('date_pick_other')}
              active={isOtherDate}
              onClick={() => setShowCalendar(true)}
            />
          </div>
          {draft.orderDate && slots.length > 0 && (
            <div class="flex gap-2 flex-wrap">
              {slots.map(slot => (
                <Chip
                  key={slot}
                  label={slot}
                  active={draft.orderSlot === slot}
                  onClick={() => patch({ orderSlot: slot })}
                />
              ))}
            </div>
          )}
          {draft.orderDate && slots.length === 0 && (
            <p class="text-xs text-gray-400">{t('no_slots')}</p>
          )}
        </div>

        {/* Дополнения (только квартира) */}
        {isApt && addons.length > 0 && (
          <div>
            <SectionLabel>Дополнения</SectionLabel>
            <div class="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
              {addons.map(addon => {
                const on = draft.addons.includes(addon.id)
                return (
                  <button
                    key={addon.id}
                    type="button"
                    onClick={() => patch({
                      addons: on
                        ? draft.addons.filter(x => x !== addon.id)
                        : [...draft.addons, addon.id],
                    })}
                    class="w-full flex items-center justify-between px-4 py-3.5 transition-colors active:bg-gray-50 text-left"
                  >
                    <span class={`text-sm font-medium ${on ? 'text-[#2D6126]' : 'text-gray-900'}`}>
                      {addon.name_ru}
                    </span>
                    <div class="flex items-center gap-3">
                      <span class="text-xs text-gray-400">+{addon.price.toLocaleString('ru-RU')}</span>
                      <div class={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
                        on ? 'bg-[#44973A] border-[#44973A]' : 'border-gray-300'
                      }`}>
                        {on && (
                          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                            <path d="M1 4l3 3 5-6" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
                          </svg>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Комментарии к заказу */}
        <div>
          <SectionLabel>Комментарии к заказу</SectionLabel>
          <textarea
            rows={3}
            placeholder={t('order_comment_placeholder')}
            value={draft.comment}
            onInput={e => patch({ comment: (e.target as HTMLTextAreaElement).value })}
            class="w-full bg-white border border-gray-200 rounded-2xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#44973A] transition-colors resize-none"
          />
        </div>

        {submitError && (
          <p class="text-red-500 text-sm text-center">{submitError}</p>
        )}

        <div class="h-4" />
      </div>

      <BottomSheet open={infoSheet !== null} onClose={() => setInfoSheet(null)}>
        {infoSheet && (
          <div class="px-5 pt-2 pb-8">
            <p class="text-base font-bold text-gray-900 mb-1">{t(`svc_${infoSheet}`)}</p>
            <p class="text-xs text-gray-400 mb-4">{t(`svc_${infoSheet}_desc`)}</p>
            <div class="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
              {t(`svc_${infoSheet}_info`)}
            </div>
          </div>
        )}
      </BottomSheet>

      <BottomSheet open={showAddressSheet} onClose={() => setShowAddressSheet(false)}>
        <AddressFormScreen
          onSubmit={handleAddressCreated}
          onBack={() => setShowAddressSheet(false)}
        />
      </BottomSheet>

      {/* Sticky CTA */}
      <div class="bg-white border-t border-gray-100 px-4 py-4">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit || submitting}
          class="w-full py-4 rounded-2xl text-sm font-semibold text-white transition-colors disabled:opacity-40"
          style="background:#44973A"
        >
          {submitting ? t('confirm_submitting') : `${t('confirm_submit')} · ${fmtPrice(price)}`}
        </button>
      </div>
    </div>
  )
}

// ─── Done screen ──────────────────────────────────────────────────────────────

function DoneScreen({ onBack, t }: { onBack: () => void; t: TFn }) {
  return (
    <div class="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6 text-center gap-5">
      <div class="w-16 h-16 rounded-full bg-[#F0F9EE] flex items-center justify-center">
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
          <path d="M5 14l7 7 11-12" stroke="#44973A" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </div>
      <div>
        <h2 class="text-lg font-bold text-gray-900 mb-1">{t('done_title')}</h2>
        <p class="text-sm text-gray-400">{t('done_subtitle')}</p>
      </div>
      <button
        type="button"
        onClick={onBack}
        class="w-full max-w-xs py-4 rounded-2xl text-sm font-semibold text-white transition-colors"
        style="background:#44973A"
      >
        {t('done_home')}
      </button>
    </div>
  )
}
