import { useEffect, useState } from 'preact/hooks'
import type { User } from '../types'
import type { Address } from '../api/addresses'
import type { Addon } from '../api/addons'
import { getAddons } from '../api/addons'
import { getAddresses } from '../api/addresses'
import { createOrder } from '../api/orders'
import { useLocale } from '../i18n'

// ─── Types ───────────────────────────────────────────────────────────────────

type ServiceType = 'standard' | 'general' | 'afterrepair'
type HousingType = 'apt' | 'house'

type Step =
  | 'service_type'
  | 'address'
  | 'rooms'
  | 'bathrooms'
  | 'date'
  | 'addons'
  | 'confirm'
  | 'done'

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
}

// ─── Constants ───────────────────────────────────────────────────────────────

const TZ_OFFSET = 5

// ─── Pricing ─────────────────────────────────────────────────────────────────

function calcPrice(
  serviceType: ServiceType,
  rooms: number,
  bathrooms: number,
  addonsList: Addon[],
  selectedAddons: string[],
): number {
  const base: Record<ServiceType, number> = {
    standard: 100000,
    general: 150000,
    afterrepair: 200000,
  }
  const perRoom: Record<ServiceType, number> = {
    standard: 30000,
    general: 50000,
    afterrepair: 60000,
  }
  const perBath: Record<ServiceType, number> = {
    standard: 20000,
    general: 30000,
    afterrepair: 40000,
  }
  const addonsTotal = addonsList
    .filter(a => selectedAddons.includes(a.id))
    .reduce((s, a) => s + a.price, 0)
  return base[serviceType] + perRoom[serviceType] * rooms + perBath[serviceType] * bathrooms + addonsTotal
}

function fmtPrice(p: number): string {
  return p.toLocaleString('ru-RU') + ' сум'
}

// ─── Date / Slot helpers ──────────────────────────────────────────────────────

function nowInTashkent(): Date {
  const now = new Date()
  const utc = now.getTime() + now.getTimezoneOffset() * 60000
  return new Date(utc + TZ_OFFSET * 3600000)
}

function availableSlots(isoDate: string): string[] {
  const tz = nowInTashkent()
  const cutoff = new Date(tz.getTime() + 3 * 3600000)

  const [y, m, d] = isoDate.split('-').map(Number)
  const slots: string[] = []

  for (let h = 8; h < 20; h++) {
    const slotAbs = Date.UTC(y, m - 1, d, h - TZ_OFFSET, 0, 0)
    if (slotAbs >= cutoff.getTime() - TZ_OFFSET * 3600000) {
      slots.push(`${String(h).padStart(2, '0')}:00–${String(h + 1).padStart(2, '0')}:00`)
    }
  }
  return slots
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

function formatDateLabel(iso: string, t: TFn): string {
  const days = next14Days(t)
  return days.find(d => d.iso === iso)?.label ?? iso
}

// ─── Navigation helpers ───────────────────────────────────────────────────────

function stepTitles(t: TFn): Partial<Record<Step, string>> {
  return {
    service_type: t('step_service_type'),
    address:      t('step_address'),
    rooms:        t('step_rooms'),
    bathrooms:    t('step_bathrooms'),
    date:         t('step_datetime'),
    addons:       t('step_addons'),
    confirm:      t('step_confirm'),
  }
}

function prevStep(step: Step, draft: Draft): Step | null {
  switch (step) {
    case 'service_type': return null
    case 'address': return 'service_type'
    case 'rooms': return 'address'
    case 'bathrooms': return 'rooms'
    case 'date': return draft.housingType === 'apt' ? 'bathrooms' : 'address'
    case 'addons': return 'date'
    case 'confirm': return draft.housingType === 'apt' ? 'addons' : 'date'
    default: return null
  }
}

function nextStep(step: Step, draft: Draft): Step | null {
  switch (step) {
    case 'service_type': return 'address'
    case 'address': return draft.housingType === 'apt' ? 'rooms' : 'date'
    case 'rooms': return 'bathrooms'
    case 'bathrooms': return 'date'
    case 'date': return draft.housingType === 'apt' ? 'addons' : 'confirm'
    case 'addons': return 'confirm'
    default: return null
  }
}

function canProceed(step: Step, draft: Draft): boolean {
  switch (step) {
    case 'address': return draft.address.trim() !== ''
    case 'date': return !!(draft.orderDate && draft.orderSlot)
    default: return true
  }
}

// ─── Draft persistence ────────────────────────────────────────────────────────

const DRAFT_KEY = 'alfaclean_order_draft'

const VALID_STEPS = new Set<string>(['service_type', 'address', 'rooms', 'bathrooms', 'date', 'addons', 'confirm'])

function loadSavedDraft(): { draft: Draft; step: Step } | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!VALID_STEPS.has(parsed?.step)) return null
    return parsed
  } catch {
    return null
  }
}

function saveDraft(draft: Draft, step: Step) {
  localStorage.setItem(DRAFT_KEY, JSON.stringify({ draft, step }))
}

function clearDraft() {
  localStorage.removeItem(DRAFT_KEY)
}

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
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  user: User
  onBack: () => void
}

export function OrderScreen({ user, onBack }: Props) {
  const { t } = useLocale()
  const saved = loadSavedDraft()
  const [step, setStep] = useState<Step>(saved?.step ?? 'service_type')
  const [draft, setDraft] = useState<Draft>(saved?.draft ?? EMPTY_DRAFT)
  const [addons, setAddons] = useState<Addon[]>([])
  const [savedAddresses, setSavedAddresses] = useState<Address[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  useEffect(() => {
    getAddons().catch(() => []).then(a => setAddons(Array.isArray(a) ? a : []))
    getAddresses(user.telegram_id).catch(() => []).then(a => setSavedAddresses(Array.isArray(a) ? a : []))
  }, [user.telegram_id])

  function patch(fields: Partial<Draft>) {
    setDraft(prev => ({ ...prev, ...fields }))
  }

  function goBack() {
    const prev = prevStep(step, draft)
    if (prev) setStep(prev)
    else onBack()
  }

  useEffect(() => {
    if (step !== 'done') saveDraft(draft, step)
  }, [draft, step])

  async function handleSubmit() {
    setSubmitting(true)
    setSubmitError(null)
    try {
      const price = calcPrice(draft.serviceType, draft.rooms, draft.bathrooms, addons, draft.addons)
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
      })
      clearDraft()
      setStep('done')
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : t('confirm_error'))
    } finally {
      setSubmitting(false)
    }
  }

  function handleNext() {
    if (step === 'confirm') {
      handleSubmit()
      return
    }
    const next = nextStep(step, draft)
    if (next) setStep(next)
  }

  if (step === 'done') {
    return <DoneScreen onBack={onBack} t={t} />
  }

  const title = stepTitles(t)[step] ?? ''
  const price = draft.rooms && draft.bathrooms
    ? calcPrice(draft.serviceType, draft.rooms, draft.bathrooms, addons, draft.addons)
    : null

  const btnLabel = step === 'confirm'
    ? (submitting ? t('confirm_submitting') : t('confirm_submit'))
    : step === 'addons'
      ? (draft.addons.length > 0 ? t('addons_selected', { n: draft.addons.length }) : t('addons_skip'))
      : t('btn_continue')

  return (
    <div class="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div class="bg-white px-4 py-4 border-b border-gray-100 flex items-center gap-3">
        <button type="button" onClick={goBack} class="text-blue-600 text-sm font-medium shrink-0">
          {t('back')}
        </button>
        <h1 class="text-base font-semibold text-gray-900 flex-1 truncate">{title}</h1>
        {price != null && step !== 'confirm' && (
          <span class="text-sm font-semibold text-blue-600 shrink-0">{fmtPrice(price)}</span>
        )}
      </div>

      {/* Step content */}
      <div class="flex-1 overflow-y-auto">
        {step === 'service_type' && (
          <StepServiceType
            value={draft.serviceType}
            t={t}
            onChange={v => patch({ serviceType: v })}
          />
        )}
        {step === 'address' && (
          <StepAddress
            saved={savedAddresses}
            value={draft.address}
            details={draft.addressDetails}
            t={t}
            onChange={(address, details, totalRooms, totalBathrooms, housingType) => {
              patch({ address, addressDetails: details, totalRooms, totalBathrooms, housingType: housingType ?? draft.housingType })
            }}
          />
        )}
        {step === 'rooms' && (
          <StepCounter
            label={t('rooms_question')}
            value={draft.rooms}
            min={1}
            max={draft.totalRooms ?? 10}
            total={draft.totalRooms}
            totalLabel={t('of_total', { n: draft.totalRooms ?? 10 })}
            onChange={v => patch({ rooms: v })}
          />
        )}
        {step === 'bathrooms' && (
          <StepCounter
            label={t('bathrooms_question')}
            value={draft.bathrooms}
            min={1}
            max={draft.totalBathrooms ?? 5}
            total={draft.totalBathrooms}
            totalLabel={t('of_total', { n: draft.totalBathrooms ?? 5 })}
            onChange={v => patch({ bathrooms: v })}
          />
        )}
        {step === 'date' && (
          <StepDateSlot
            dateValue={draft.orderDate}
            slotValue={draft.orderSlot}
            t={t}
            onChange={(iso, slot) => patch({ orderDate: iso, orderSlot: slot })}
          />
        )}
        {step === 'addons' && (
          <StepAddons
            addons={addons}
            selected={draft.addons}
            t={t}
            onChange={ids => patch({ addons: ids })}
          />
        )}
        {step === 'confirm' && (
          <StepConfirm
            draft={draft}
            addons={addons}
            price={calcPrice(draft.serviceType, draft.rooms, draft.bathrooms, addons, draft.addons)}
            error={submitError}
            t={t}
          />
        )}
      </div>

      {/* Bottom action button */}
      <div class="bg-white border-t border-gray-100 px-4 py-4 safe-bottom">
        <button
          type="button"
          onClick={handleNext}
          disabled={!canProceed(step, draft) || submitting}
          class="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold py-4 rounded-xl transition-colors"
        >
          {btnLabel}
        </button>
      </div>
    </div>
  )
}

// ─── Step: Service Type ───────────────────────────────────────────────────────

function StepServiceType({
  value,
  onChange,
  t,
}: {
  value: ServiceType
  onChange: (v: ServiceType) => void
  t: TFn
}) {
  const types: ServiceType[] = ['standard', 'general', 'afterrepair']
  return (
    <div class="px-4 py-5 flex flex-col gap-3">
      {types.map(type => (
        <button
          key={type}
          type="button"
          onClick={() => onChange(type)}
          class={`w-full text-left p-4 rounded-2xl border-2 transition-colors ${
            value === type ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white'
          }`}
        >
          <p class={`text-sm font-semibold ${value === type ? 'text-blue-700' : 'text-gray-900'}`}>
            {t(`svc_${type}`)}
          </p>
          <p class="text-xs text-gray-400 mt-0.5">{t(`svc_${type}_desc`)}</p>
        </button>
      ))}
    </div>
  )
}

// ─── Step: Address ────────────────────────────────────────────────────────────

function StepAddress({
  saved,
  value,
  details,
  onChange,
  t,
}: {
  saved: Address[]
  value: string
  details: string
  onChange: (address: string, details: string, totalRooms?: number, totalBathrooms?: number, housingType?: HousingType) => void
  t: TFn
}) {
  const [manualMode, setManualMode] = useState(saved.length === 0)

  return (
    <div class="px-4 py-5 flex flex-col gap-4">
      {saved.length > 0 && !manualMode && (
        <>
          <p class="text-xs font-medium text-gray-500">{t('order_saved_addresses')}</p>
          {saved.slice(0, 5).map(addr => (
            <button
              key={addr.id}
              type="button"
              onClick={() => onChange(addr.address, addr.notes ?? '', addr.rooms ?? undefined, addr.bathrooms ?? undefined, addr.housing_type ?? undefined)}
              class={`w-full text-left rounded-xl p-4 border-2 transition-colors ${
                value === addr.address ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white'
              }`}
            >
              <p class={`text-sm font-medium truncate ${value === addr.address ? 'text-blue-700' : 'text-gray-900'}`}>
                {addr.address}
              </p>
              {(addr.entrance || addr.floor || addr.apartment) && (
                <p class="text-xs text-gray-400 mt-0.5">
                  {[
                    addr.entrance && t('home_entrance', { n: addr.entrance }),
                    addr.floor && t('home_floor', { n: addr.floor }),
                    addr.apartment && t('home_apt', { n: addr.apartment }),
                  ].filter(Boolean).join(', ')}
                </p>
              )}
              {(addr.rooms != null || addr.bathrooms != null) && (
                <p class="text-xs text-blue-500 mt-1">
                  {[
                    addr.rooms != null && `${addr.rooms} ${t('home_rooms_short')}`,
                    addr.bathrooms != null && `${addr.bathrooms} ${t('home_bathrooms_short')}`,
                  ].filter(Boolean).join(' · ')}
                </p>
              )}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setManualMode(true)}
            class="text-blue-600 text-sm font-medium text-center py-2"
          >
            {t('order_add_other')}
          </button>
        </>
      )}

      {manualMode && (
        <>
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-medium text-gray-500">{t('addr_label')}</label>
            <input
              type="text"
              placeholder={t('addr_placeholder')}
              value={value}
              onInput={e => onChange((e.target as HTMLInputElement).value, details)}
              class="bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-400"
            />
          </div>
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-medium text-gray-500">{t('addr_entrance_label')}, {t('addr_floor_label')}, {t('addr_apt_label')}</label>
            <input
              type="text"
              placeholder={t('order_details_placeholder')}
              value={details}
              onInput={e => onChange(value, (e.target as HTMLInputElement).value)}
              class="bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-400"
            />
          </div>
          {saved.length > 0 && (
            <button
              type="button"
              onClick={() => setManualMode(false)}
              class="text-gray-400 text-sm font-medium text-center py-1"
            >
              {t('order_back_to_saved')}
            </button>
          )}
        </>
      )}
    </div>
  )
}

// ─── Step: Counter (rooms / bathrooms) ───────────────────────────────────────

function StepCounter({
  label,
  value,
  min,
  max,
  total,
  totalLabel,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  total?: number
  totalLabel?: string
  onChange: (v: number) => void
}) {
  return (
    <div class="px-4 py-10 flex flex-col items-center gap-8">
      <p class="text-base font-medium text-gray-700">{label}</p>
      <div class="flex items-center gap-6">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          class="w-14 h-14 rounded-2xl bg-gray-100 text-gray-700 text-2xl font-light disabled:opacity-30 hover:bg-gray-200 transition-colors"
        >
          −
        </button>
        <div class="flex flex-col items-center">
          <span class="text-4xl font-semibold text-gray-900 leading-none">{value}</span>
          {total != null && totalLabel && (
            <span class="text-sm text-gray-400 mt-1">{totalLabel}</span>
          )}
        </div>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          class="w-14 h-14 rounded-2xl bg-gray-100 text-gray-700 text-2xl font-light disabled:opacity-30 hover:bg-gray-200 transition-colors"
        >
          +
        </button>
      </div>
    </div>
  )
}

// ─── Step: Date + Slot ───────────────────────────────────────────────────────

function StepDateSlot({
  dateValue,
  slotValue,
  onChange,
  t,
}: {
  dateValue: string
  slotValue: string
  onChange: (date: string, slot: string) => void
  t: TFn
}) {
  const days = next14Days(t)
  const slots = dateValue ? availableSlots(dateValue) : []

  return (
    <div class="flex flex-col gap-6 py-5">
      <div class="flex flex-col gap-3">
        <p class="text-xs font-medium text-gray-500 px-4">{t('choose_date')}</p>
        <div
          class="flex gap-2 overflow-x-auto px-4 pb-1"
          style="scrollbar-width:none;-ms-overflow-style:none"
        >
          {days.map(({ iso, label }) => (
            <button
              key={iso}
              type="button"
              onClick={() => onChange(iso, '')}
              class={`shrink-0 px-4 py-2.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                dateValue === iso
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border border-gray-200 text-gray-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {dateValue && (
        <div class="flex flex-col gap-3">
          <p class="text-xs font-medium text-gray-500 px-4">{t('choose_time')}</p>
          {slots.length === 0 ? (
            <p class="text-sm text-gray-400 px-4">{t('no_slots')}</p>
          ) : (
            <div
              class="flex gap-2 overflow-x-auto px-4 pb-1"
              style="scrollbar-width:none;-ms-overflow-style:none"
            >
              {slots.map(slot => (
                <button
                  key={slot}
                  type="button"
                  onClick={() => onChange(dateValue, slot)}
                  class={`shrink-0 px-4 py-2.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                    slotValue === slot
                      ? 'bg-blue-600 text-white'
                      : 'bg-white border border-gray-200 text-gray-700'
                  }`}
                >
                  {slot}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Step: Addons ─────────────────────────────────────────────────────────────

function StepAddons({
  addons,
  selected,
  onChange,
  t,
}: {
  addons: Addon[]
  selected: string[]
  onChange: (ids: string[]) => void
  t: TFn
}) {
  function toggle(id: string) {
    onChange(selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id])
  }
  return (
    <div class="px-4 py-5 flex flex-col gap-3">
      {addons.length === 0 && (
        <p class="text-xs text-gray-400 text-center py-4">{t('no_addons')}</p>
      )}
      {addons.map(addon => {
        const on = selected.includes(addon.id)
        return (
          <button
            key={addon.id}
            type="button"
            onClick={() => toggle(addon.id)}
            class={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-colors ${
              on ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white'
            }`}
          >
            <span class={`text-sm font-medium ${on ? 'text-blue-700' : 'text-gray-900'}`}>
              {addon.name_ru}
            </span>
            <span class={`text-xs font-semibold ${on ? 'text-blue-600' : 'text-gray-400'}`}>
              +{addon.price.toLocaleString('ru-RU')}
            </span>
          </button>
        )
      })}
    </div>
  )
}

// ─── Step: Confirm ────────────────────────────────────────────────────────────

function StepConfirm({
  draft,
  addons,
  price,
  error,
  t,
}: {
  draft: Draft
  addons: Addon[]
  price: number
  error: string | null
  t: TFn
}) {
  const selectedAddons = addons.filter(a => draft.addons.includes(a.id))
  const address = draft.addressDetails
    ? `${draft.address}, ${draft.addressDetails}`
    : draft.address

  return (
    <div class="px-4 py-5 flex flex-col gap-3">
      <div class="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <Row label={t('confirm_service')} value={t(`svc_${draft.serviceType}`)} />
        <Row label={t('confirm_address')} value={address} />
        <Row label={t('confirm_rooms')} value={String(draft.rooms)} />
        <Row label={t('confirm_bathrooms')} value={String(draft.bathrooms)} />
        <Row label={t('confirm_date')} value={formatDateLabel(draft.orderDate, t)} />
        <Row label={t('confirm_time')} value={draft.orderSlot} />
        {selectedAddons.length > 0 && (
          <Row label={t('confirm_addons')} value={selectedAddons.map(a => a.name_ru).join(', ')} />
        )}
        <div class="px-4 py-3 flex items-center justify-between border-t border-gray-100">
          <span class="text-sm font-semibold text-gray-900">{t('confirm_total')}</span>
          <span class="text-base font-bold text-blue-600">{fmtPrice(price)}</span>
        </div>
      </div>

      {error && <p class="text-red-500 text-sm text-center">{error}</p>}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div class="px-4 py-3 flex items-start justify-between gap-4 border-b border-gray-50">
      <span class="text-xs text-gray-400 shrink-0">{label}</span>
      <span class="text-sm text-gray-900 text-right">{value}</span>
    </div>
  )
}

// ─── Done screen ──────────────────────────────────────────────────────────────

function DoneScreen({ onBack, t }: { onBack: () => void; t: TFn }) {
  return (
    <div class="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6 text-center gap-5">
      <div class="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center text-3xl">
        ✓
      </div>
      <div>
        <h2 class="text-lg font-semibold text-gray-900 mb-1">{t('done_title')}</h2>
        <p class="text-sm text-gray-400">{t('done_subtitle')}</p>
      </div>
      <button
        type="button"
        onClick={onBack}
        class="w-full max-w-xs bg-blue-600 hover:bg-blue-700 text-white font-medium py-3.5 rounded-xl transition-colors"
      >
        {t('done_home')}
      </button>
    </div>
  )
}
