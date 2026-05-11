import { useEffect, useState } from 'preact/hooks'
import type { User } from '../types'
import type { Address } from '../api/addresses'
import type { Addon } from '../api/addons'
import { getAddons } from '../api/addons'
import { getAddresses } from '../api/addresses'
import { createOrder } from '../api/orders'

// ─── Types ───────────────────────────────────────────────────────────────────

type ServiceType = 'standard' | 'general' | 'afterrepair'
type HousingType = 'apt' | 'house'

type Step =
  | 'service_type'
  | 'housing_type'
  | 'address'
  | 'rooms'
  | 'bathrooms'
  | 'date'
  | 'time_slot'
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
  totalRooms?: number    // from saved address
  totalBathrooms?: number
  orderDate: string  // ISO yyyy-mm-dd
  orderSlot: string
  addons: string[]
}

// ─── Constants ───────────────────────────────────────────────────────────────

const TZ_OFFSET = 5 // Asia/Tashkent = UTC+5

const SERVICE_LABELS: Record<ServiceType, string> = {
  standard: 'Стандартная уборка',
  general: 'Генеральная уборка',
  afterrepair: 'После ремонта',
}

const SERVICE_DESCRIPTIONS: Record<ServiceType, string> = {
  standard: 'Регулярная поддерживающая уборка',
  general: 'Глубокая уборка с мытьём окон и техники',
  afterrepair: 'Уборка после ремонта и строительства',
}

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
  const cutoff = new Date(tz.getTime() + 3 * 3600000) // +3h buffer

  const [y, m, d] = isoDate.split('-').map(Number)
  const slots: string[] = []

  for (let h = 8; h < 20; h++) {
    const slotStart = new Date(y, m - 1, d, h, 0, 0, 0)
    // Adjust slotStart to Tashkent — compare apples to apples
    const slotTz = new Date(slotStart.getTime())
    // slotStart is in local browser time; cutoff is in Tashkent
    // Compute slotStart as Tashkent time directly
    const slotAbs = Date.UTC(y, m - 1, d, h - TZ_OFFSET, 0, 0)
    if (slotAbs >= cutoff.getTime() - TZ_OFFSET * 3600000) {
      slots.push(`${String(h).padStart(2, '0')}:00–${String(h + 1).padStart(2, '0')}:00`)
    }
  }
  return slots
}

function next14Days(): Array<{ iso: string; label: string }> {
  const tz = nowInTashkent()
  const result: Array<{ iso: string; label: string }> = []

  for (let i = 0; i < 14; i++) {
    const d = new Date(tz)
    d.setDate(d.getDate() + i)
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    if (availableSlots(iso).length === 0) continue

    let label: string
    if (i === 0) label = 'Сегодня'
    else if (i === 1) label = 'Завтра'
    else {
      const days = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']
      const months = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек']
      label = `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]}`
    }
    result.push({ iso, label })
  }
  return result
}

function formatDateLabel(iso: string): string {
  const days = next14Days()
  return days.find(d => d.iso === iso)?.label ?? iso
}

// ─── Navigation helpers ───────────────────────────────────────────────────────

const STEP_TITLES: Partial<Record<Step, string>> = {
  service_type: 'Тип уборки',
  housing_type: 'Тип помещения',
  address: 'Адрес',
  rooms: 'Количество комнат',
  bathrooms: 'Количество санузлов',
  date: 'Дата и время',
  addons: 'Дополнительно',
  confirm: 'Подтверждение',
}

function prevStep(step: Step, draft: Draft): Step | null {
  switch (step) {
    case 'service_type': return null
    case 'housing_type': return 'service_type'
    case 'address': return 'housing_type'
    case 'rooms': return 'address'
    case 'bathrooms': return 'rooms'
    case 'date': return draft.housingType === 'apt' ? 'bathrooms' : 'address'
    case 'time_slot': return 'date'
    case 'addons': return 'date'
    case 'confirm': return draft.housingType === 'apt' ? 'addons' : 'date'
    default: return null
  }
}

// ─── Draft persistence ────────────────────────────────────────────────────────

const DRAFT_KEY = 'alfaclean_order_draft'

function loadSavedDraft(): { draft: Draft; step: Step } | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    return raw ? JSON.parse(raw) : null
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

  function goTo(s: Step) {
    setStep(s)
  }

  function goBack() {
    const prev = prevStep(step, draft)
    if (prev) setStep(prev)
    else onBack()
  }

  // Persist draft on every change
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
      setSubmitError(e instanceof Error ? e.message : 'Ошибка оформления')
    } finally {
      setSubmitting(false)
    }
  }

  if (step === 'done') {
    return <DoneScreen onBack={onBack} />
  }

  const title = STEP_TITLES[step] ?? ''
  const price = draft.rooms && draft.bathrooms
    ? calcPrice(draft.serviceType, draft.rooms, draft.bathrooms, addons, draft.addons)
    : null

  return (
    <div class="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div class="bg-white px-4 py-4 border-b border-gray-100 flex items-center gap-3">
        <button type="button" onClick={goBack} class="text-blue-600 text-sm font-medium shrink-0">
          ← Назад
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
            onChange={v => { patch({ serviceType: v }); goTo('housing_type') }}
          />
        )}
        {step === 'housing_type' && (
          <StepHousingType
            value={draft.housingType}
            onChange={v => { patch({ housingType: v }); goTo('address') }}
          />
        )}
        {step === 'address' && (
          <StepAddress
            saved={savedAddresses}
            value={draft.address}
            details={draft.addressDetails}
            onChange={(address, details, totalRooms, totalBathrooms) => {
              patch({ address, addressDetails: details, totalRooms, totalBathrooms })
              goTo(draft.housingType === 'apt' ? 'rooms' : 'date')
            }}
          />
        )}
        {step === 'rooms' && (
          <StepCounter
            label="Сколько комнат уберём в заказе?"
            value={draft.rooms}
            min={1}
            max={draft.totalRooms ?? 10}
            total={draft.totalRooms}
            onNext={v => { patch({ rooms: v }); goTo('bathrooms') }}
          />
        )}
        {step === 'bathrooms' && (
          <StepCounter
            label="Сколько санузлов уберём в заказе?"
            value={draft.bathrooms}
            min={1}
            max={draft.totalBathrooms ?? 5}
            total={draft.totalBathrooms}
            onNext={v => { patch({ bathrooms: v }); goTo('date') }}
          />
        )}
        {step === 'date' && (
          <StepDateSlot
            dateValue={draft.orderDate}
            slotValue={draft.orderSlot}
            onNext={(iso, slot) => {
              patch({ orderDate: iso, orderSlot: slot })
              goTo(draft.housingType === 'apt' ? 'addons' : 'confirm')
            }}
          />
        )}
        {step === 'addons' && (
          <StepAddons
            addons={addons}
            selected={draft.addons}
            onChange={ids => patch({ addons: ids })}
            onNext={() => goTo('confirm')}
          />
        )}
        {step === 'confirm' && (
          <StepConfirm
            draft={draft}
            addons={addons}
            price={calcPrice(draft.serviceType, draft.rooms, draft.bathrooms, addons, draft.addons)}
            submitting={submitting}
            error={submitError}
            onSubmit={handleSubmit}
          />
        )}
      </div>
    </div>
  )
}

// ─── Step: Service Type ───────────────────────────────────────────────────────

function StepServiceType({
  value,
  onChange,
}: {
  value: ServiceType
  onChange: (v: ServiceType) => void
}) {
  const types: ServiceType[] = ['standard', 'general', 'afterrepair']
  return (
    <div class="px-4 py-5 flex flex-col gap-3">
      {types.map(t => (
        <button
          key={t}
          type="button"
          onClick={() => onChange(t)}
          class={`w-full text-left p-4 rounded-2xl border-2 transition-colors ${
            value === t ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white'
          }`}
        >
          <p class={`text-sm font-semibold ${value === t ? 'text-blue-700' : 'text-gray-900'}`}>
            {SERVICE_LABELS[t]}
          </p>
          <p class="text-xs text-gray-400 mt-0.5">{SERVICE_DESCRIPTIONS[t]}</p>
        </button>
      ))}
    </div>
  )
}

// ─── Step: Housing Type ───────────────────────────────────────────────────────

function StepHousingType({
  value,
  onChange,
}: {
  value: HousingType
  onChange: (v: HousingType) => void
}) {
  return (
    <div class="px-4 py-5 flex flex-col gap-3">
      <button
        type="button"
        onClick={() => onChange('apt')}
        class={`w-full text-left p-4 rounded-2xl border-2 transition-colors ${
          value === 'apt' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white'
        }`}
      >
        <p class={`text-sm font-semibold ${value === 'apt' ? 'text-blue-700' : 'text-gray-900'}`}>
          Квартира
        </p>
        <p class="text-xs text-gray-400 mt-0.5">Апартаменты, студия, комната</p>
      </button>
      <button
        type="button"
        onClick={() => onChange('house')}
        class={`w-full text-left p-4 rounded-2xl border-2 transition-colors ${
          value === 'house' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white'
        }`}
      >
        <p class={`text-sm font-semibold ${value === 'house' ? 'text-blue-700' : 'text-gray-900'}`}>
          Частный дом
        </p>
        <p class="text-xs text-gray-400 mt-0.5">Расчёт стоимости по часам</p>
      </button>
    </div>
  )
}

// ─── Step: Address ────────────────────────────────────────────────────────────

function StepAddress({
  saved,
  value,
  details,
  onChange,
}: {
  saved: Address[]
  value: string
  details: string
  onChange: (address: string, details: string, totalRooms?: number, totalBathrooms?: number) => void
}) {
  const [manualMode, setManualMode] = useState(saved.length === 0)
  const [text, setText] = useState(value)
  const [det, setDet] = useState(details)

  function submitManual() {
    if (!text.trim()) return
    onChange(text.trim(), det.trim())
  }

  return (
    <div class="px-4 py-5 flex flex-col gap-4">
      {saved.length > 0 && !manualMode && (
        <>
          <p class="text-xs font-medium text-gray-500">Сохранённые адреса</p>
          {saved.slice(0, 5).map(addr => (
            <button
              key={addr.id}
              type="button"
              onClick={() => onChange(addr.address, addr.notes ?? '', addr.rooms ?? undefined, addr.bathrooms ?? undefined)}
              class="w-full text-left bg-white rounded-xl p-4 border border-gray-200"
            >
              <p class="text-sm font-medium text-gray-900 truncate">{addr.address}</p>
              {(addr.entrance || addr.floor || addr.apartment) && (
                <p class="text-xs text-gray-400 mt-0.5">
                  {[
                    addr.entrance && `подъезд ${addr.entrance}`,
                    addr.floor && `эт. ${addr.floor}`,
                    addr.apartment && `кв. ${addr.apartment}`,
                  ].filter(Boolean).join(', ')}
                </p>
              )}
              {(addr.rooms != null || addr.bathrooms != null) && (
                <p class="text-xs text-blue-500 mt-1">
                  {[
                    addr.rooms != null && `${addr.rooms} комн.`,
                    addr.bathrooms != null && `${addr.bathrooms} санузл.`,
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
            + Ввести другой адрес
          </button>
        </>
      )}

      {manualMode && (
        <>
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-medium text-gray-500">Адрес*</label>
            <input
              type="text"
              placeholder="ул. Навои 5"
              value={text}
              onInput={e => setText((e.target as HTMLInputElement).value)}
              class="bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-400"
            />
          </div>
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-medium text-gray-500">Подъезд, этаж, квартира (необязательно)</label>
            <input
              type="text"
              placeholder="подъезд 3, эт. 5, кв. 12"
              value={det}
              onInput={e => setDet((e.target as HTMLInputElement).value)}
              class="bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-400"
            />
          </div>
          {saved.length > 0 && (
            <button
              type="button"
              onClick={() => setManualMode(false)}
              class="text-gray-400 text-sm font-medium text-center py-1"
            >
              ← К сохранённым адресам
            </button>
          )}
          <div class="mt-2">
            <button
              type="button"
              onClick={submitManual}
              disabled={!text.trim()}
              class="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-medium py-3.5 rounded-xl transition-colors"
            >
              Продолжить
            </button>
          </div>
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
  onNext,
}: {
  label: string
  value: number
  min: number
  max: number
  total?: number
  onNext: (v: number) => void
}) {
  const [count, setCount] = useState(value)
  return (
    <div class="px-4 py-10 flex flex-col items-center gap-8">
      <p class="text-base font-medium text-gray-700">{label}</p>
      <div class="flex items-center gap-6">
        <button
          type="button"
          onClick={() => setCount(c => Math.max(min, c - 1))}
          disabled={count <= min}
          class="w-14 h-14 rounded-2xl bg-gray-100 text-gray-700 text-2xl font-light disabled:opacity-30 hover:bg-gray-200 transition-colors"
        >
          −
        </button>
        <div class="flex flex-col items-center">
          <span class="text-4xl font-semibold text-gray-900 leading-none">{count}</span>
          {total != null && (
            <span class="text-sm text-gray-400 mt-1">из {total}</span>
          )}
        </div>
        <button
          type="button"
          onClick={() => setCount(c => Math.min(max, c + 1))}
          disabled={count >= max}
          class="w-14 h-14 rounded-2xl bg-gray-100 text-gray-700 text-2xl font-light disabled:opacity-30 hover:bg-gray-200 transition-colors"
        >
          +
        </button>
      </div>
      <button
        type="button"
        onClick={() => onNext(count)}
        class="w-full max-w-xs bg-blue-600 hover:bg-blue-700 text-white font-medium py-3.5 rounded-xl transition-colors"
      >
        Продолжить
      </button>
    </div>
  )
}

// ─── Step: Date + Slot ───────────────────────────────────────────────────────

function StepDateSlot({
  dateValue,
  slotValue,
  onNext,
}: {
  dateValue: string
  slotValue: string
  onNext: (date: string, slot: string) => void
}) {
  const [selectedDate, setSelectedDate] = useState(dateValue || '')
  const days = next14Days()
  const slots = selectedDate ? availableSlots(selectedDate) : []

  return (
    <div class="flex flex-col gap-6 py-5">
      <div class="flex flex-col gap-3">
        <p class="text-xs font-medium text-gray-500 px-4">Выберите дату</p>
        <div
          class="flex gap-2 overflow-x-auto px-4 pb-1"
          style="scrollbar-width:none;-ms-overflow-style:none"
        >
          {days.map(({ iso, label }) => (
            <button
              key={iso}
              type="button"
              onClick={() => setSelectedDate(iso)}
              class={`shrink-0 px-4 py-2.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                selectedDate === iso
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border border-gray-200 text-gray-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {selectedDate && (
        <div class="flex flex-col gap-3">
          <p class="text-xs font-medium text-gray-500 px-4">Выберите время</p>
          {slots.length === 0 ? (
            <p class="text-sm text-gray-400 px-4">Нет доступных слотов на этот день</p>
          ) : (
            <div
              class="flex gap-2 overflow-x-auto px-4 pb-1"
              style="scrollbar-width:none;-ms-overflow-style:none"
            >
              {slots.map(slot => (
                <button
                  key={slot}
                  type="button"
                  onClick={() => onNext(selectedDate, slot)}
                  class={`shrink-0 px-4 py-2.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                    slotValue === slot && dateValue === selectedDate
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
  onNext,
}: {
  addons: Addon[]
  selected: string[]
  onChange: (ids: string[]) => void
  onNext: () => void
}) {
  function toggle(id: string) {
    onChange(selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id])
  }
  return (
    <div class="px-4 py-5 flex flex-col gap-3">
      {addons.length === 0 && (
        <p class="text-xs text-gray-400 text-center py-4">Дополнительные услуги недоступны</p>
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
      <div class="mt-2">
        <button
          type="button"
          onClick={onNext}
          class="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3.5 rounded-xl transition-colors"
        >
          {selected.length > 0 ? `Продолжить (${selected.length} выбрано)` : 'Пропустить'}
        </button>
      </div>
    </div>
  )
}

// ─── Step: Confirm ────────────────────────────────────────────────────────────

function StepConfirm({
  draft,
  addons,
  price,
  submitting,
  error,
  onSubmit,
}: {
  draft: Draft
  addons: Addon[]
  price: number
  submitting: boolean
  error: string | null
  onSubmit: () => void
}) {
  const selectedAddons = addons.filter(a => draft.addons.includes(a.id))
  const address = draft.addressDetails
    ? `${draft.address}, ${draft.addressDetails}`
    : draft.address

  return (
    <div class="px-4 py-5 flex flex-col gap-3">
      <div class="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <Row label="Услуга" value={SERVICE_LABELS[draft.serviceType]} />
        <Row label="Адрес" value={address} />
        <Row label="Комнат" value={String(draft.rooms)} />
        <Row label="Санузлов" value={String(draft.bathrooms)} />
        <Row label="Дата" value={formatDateLabel(draft.orderDate)} />
        <Row label="Время" value={draft.orderSlot} />
        {selectedAddons.length > 0 && (
          <Row label="Доп. услуги" value={selectedAddons.map(a => a.name_ru).join(', ')} />
        )}
        <div class="px-4 py-3 flex items-center justify-between border-t border-gray-100">
          <span class="text-sm font-semibold text-gray-900">Итого</span>
          <span class="text-base font-bold text-blue-600">{fmtPrice(price)}</span>
        </div>
      </div>

      {error && <p class="text-red-500 text-sm text-center">{error}</p>}

      <button
        type="button"
        onClick={onSubmit}
        disabled={submitting}
        class="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-4 rounded-xl transition-colors mt-2"
      >
        {submitting ? 'Оформляем...' : 'Подтвердить заказ'}
      </button>
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

function DoneScreen({ onBack }: { onBack: () => void }) {
  return (
    <div class="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6 text-center gap-5">
      <div class="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center text-3xl">
        ✓
      </div>
      <div>
        <h2 class="text-lg font-semibold text-gray-900 mb-1">Заказ оформлен!</h2>
        <p class="text-sm text-gray-400">Мы свяжемся с вами для подтверждения</p>
      </div>
      <button
        type="button"
        onClick={onBack}
        class="w-full max-w-xs bg-blue-600 hover:bg-blue-700 text-white font-medium py-3.5 rounded-xl transition-colors"
      >
        На главную
      </button>
    </div>
  )
}
