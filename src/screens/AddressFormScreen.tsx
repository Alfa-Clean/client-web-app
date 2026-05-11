import { useState } from 'preact/hooks'
import type { Address, AddressPayload } from '../api/addresses'
import { reverseGeocode } from '../api/geocode'
import { MapPicker } from '../components/MapPicker'

interface Props {
  initial?: Address
  onSubmit: (data: AddressPayload) => Promise<void>
  onBack: () => void
}

export function AddressFormScreen({ initial, onSubmit, onBack }: Props) {
  const [form, setForm] = useState<AddressPayload>({
    address: initial?.address ?? '',
    entrance: initial?.entrance ?? '',
    floor: initial?.floor ?? '',
    apartment: initial?.apartment ?? '',
    intercom: initial?.intercom ?? '',
    notes: initial?.notes ?? '',
    rooms: initial?.rooms ?? undefined,
    bathrooms: initial?.bathrooms ?? undefined,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showMap, setShowMap] = useState(true)
  const [geocoding, setGeocoding] = useState(false)

  async function handleLocationPick(lat: number, lon: number) {
    setGeocoding(true)
    try {
      const resolved = await reverseGeocode(lat, lon)
      if (resolved) setField('address', resolved)
    } finally {
      setGeocoding(false)
    }
  }

  function setField(field: keyof AddressPayload, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function setCount(field: 'rooms' | 'bathrooms', value: number) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: Event) {
    e.preventDefault()
    if (!form.address.trim()) {
      setError('Введите адрес')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const payload: AddressPayload = {
        address: form.address.trim(),
        ...(form.entrance?.trim() && { entrance: form.entrance.trim() }),
        ...(form.floor?.trim() && { floor: form.floor.trim() }),
        ...(form.apartment?.trim() && { apartment: form.apartment.trim() }),
        ...(form.intercom?.trim() && { intercom: form.intercom.trim() }),
        ...(form.notes?.trim() && { notes: form.notes.trim() }),
        ...(form.rooms != null && { rooms: form.rooms }),
        ...(form.bathrooms != null && { bathrooms: form.bathrooms }),
      }
      await onSubmit(payload)
      onBack()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка сохранения')
    } finally {
      setLoading(false)
    }
  }

  const isEdit = !!initial

  return (
    <div class="min-h-screen bg-gray-50 flex flex-col">
      <div class="bg-white px-4 py-5 border-b border-gray-100 flex items-center gap-3">
        <button type="button" onClick={onBack} class="text-blue-600 text-sm font-medium">
          ← Назад
        </button>
        <h1 class="text-base font-semibold text-gray-900">
          {isEdit ? 'Редактировать адрес' : 'Новый адрес'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} class="flex-1 flex flex-col px-4 py-5 gap-4">
        <div class="flex flex-col gap-2">
          <div class="flex items-center justify-between">
            <span class="text-xs font-medium text-gray-500">Укажите точку на карте</span>
            <button
              type="button"
              onClick={() => setShowMap(v => !v)}
              class="text-xs text-blue-600 font-medium"
            >
              {showMap ? 'Скрыть' : 'Показать карту'}
            </button>
          </div>
          {showMap && (
            <div class="flex flex-col gap-2">
              <MapPicker onLocationPick={handleLocationPick} />
              {geocoding && (
                <p class="text-xs text-gray-400">Определяем адрес...</p>
              )}
            </div>
          )}
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-medium text-gray-500">Адрес*</label>
            <input
              type="text"
              placeholder="ул. Навои 5"
              value={form.address}
              onInput={e => setField('address', (e.target as HTMLInputElement).value)}
              class="bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-400"
            />
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <Field
            label="Подъезд"
            placeholder="3"
            value={form.entrance ?? ''}
            onChange={v => setField('entrance', v)}
          />
          <Field
            label="Этаж"
            placeholder="7"
            value={form.floor ?? ''}
            onChange={v => setField('floor', v)}
          />
        </div>
        <div class="grid grid-cols-2 gap-3">
          <Field
            label="Квартира"
            placeholder="12"
            value={form.apartment ?? ''}
            onChange={v => setField('apartment', v)}
          />
          <Field
            label="Домофон"
            placeholder="1247"
            value={form.intercom ?? ''}
            onChange={v => setField('intercom', v)}
          />
        </div>

        <div class="flex flex-col gap-3">
          <CounterField
            label="Комнат"
            value={form.rooms ?? null}
            min={1}
            max={10}
            onChange={v => setCount('rooms', v)}
          />
          <CounterField
            label="Санузлов"
            value={form.bathrooms ?? null}
            min={1}
            max={5}
            onChange={v => setCount('bathrooms', v)}
          />
        </div>

        <Field
          label="Доп. информация"
          placeholder="Ключ у консьержа, собака во дворе..."
          value={form.notes ?? ''}
          onChange={v => setField('notes', v)}
        />

        {error && <p class="text-red-500 text-sm">{error}</p>}

        <div class="mt-auto pt-4">
          <button
            type="submit"
            disabled={loading}
            class="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-3.5 rounded-xl transition-colors"
          >
            {loading ? 'Сохранение...' : isEdit ? 'Сохранить' : 'Добавить'}
          </button>
        </div>
      </form>
    </div>
  )
}

interface FieldProps {
  label: string
  placeholder: string
  value: string
  onChange: (v: string) => void
}

function Field({ label, placeholder, value, onChange }: FieldProps) {
  return (
    <div class="flex flex-col gap-1.5">
      <label class="text-xs font-medium text-gray-500">{label}</label>
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onInput={e => onChange((e.target as HTMLInputElement).value)}
        class="bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-400"
      />
    </div>
  )
}

interface CounterFieldProps {
  label: string
  value: number | null
  min: number
  max: number
  onChange: (v: number) => void
}

function CounterField({ label, value, min, max, onChange }: CounterFieldProps) {
  return (
    <div class="flex items-center justify-between">
      <span class="text-xs font-medium text-gray-500">{label}</span>
      <div class="flex items-center gap-3">
        <button
          type="button"
          onClick={() => value != null && onChange(Math.max(min, value - 1))}
          disabled={value == null || value <= min}
          class="w-9 h-9 rounded-xl bg-gray-100 text-gray-600 text-lg font-medium disabled:opacity-30 hover:bg-gray-200 transition-colors"
        >
          −
        </button>
        <span class="w-5 text-center text-sm font-semibold text-gray-900">{value ?? '—'}</span>
        <button
          type="button"
          onClick={() => onChange(value == null ? min : Math.min(max, value + 1))}
          disabled={value != null && value >= max}
          class="w-9 h-9 rounded-xl bg-gray-100 text-gray-600 text-lg font-medium disabled:opacity-30 hover:bg-gray-200 transition-colors"
        >
          +
        </button>
      </div>
    </div>
  )
}
