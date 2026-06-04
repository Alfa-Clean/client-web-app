import { useState } from 'preact/hooks'
import type { Address, AddressPayload, HousingType } from '../api/addresses'
import { reverseGeocode } from '../api/geocode'
import { MapPicker } from '../components/MapPicker'
import { useLocale } from '../i18n'

interface Props {
  initial?: Address
  onSubmit: (data: AddressPayload) => Promise<void>
  onBack: () => void
}

export function AddressFormScreen({ initial, onSubmit, onBack }: Props) {
  const { t } = useLocale()
  const [form, setForm] = useState<AddressPayload>({
    label: initial?.label ?? '',
    address: initial?.address ?? '',
    entrance: initial?.entrance ?? '',
    floor: initial?.floor ?? '',
    apartment: initial?.apartment ?? '',
    intercom: initial?.intercom ?? '',
    notes: initial?.notes ?? '',
    rooms: initial?.rooms ?? undefined,
    bathrooms: initial?.bathrooms ?? undefined,
    housing_type: initial?.housing_type ?? undefined,
    latitude: initial?.latitude ?? undefined,
    longitude: initial?.longitude ?? undefined,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showMap, setShowMap] = useState(true)
  const [geocoding, setGeocoding] = useState(false)

  async function handleLocationPick(lat: number, lon: number) {
    setForm(prev => ({ ...prev, latitude: lat, longitude: lon }))
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
    if (!form.address.trim()) { setError(t('addr_required')); return }
    if (form.housing_type === 'apt') {
      if (!form.entrance?.trim()) { setError(t('addr_entrance_required')); return }
      if (!form.floor?.trim()) { setError(t('addr_floor_required')); return }
      if (!form.apartment?.trim()) { setError(t('addr_apt_required')); return }
    }
    setLoading(true)
    setError(null)
    try {
      const payload: AddressPayload = {
        ...(form.label?.trim() && { label: form.label.trim() }),
        address: form.address.trim(),
        ...(form.entrance?.trim() && { entrance: form.entrance.trim() }),
        ...(form.floor?.trim() && { floor: form.floor.trim() }),
        ...(form.apartment?.trim() && { apartment: form.apartment.trim() }),
        ...(form.intercom?.trim() && { intercom: form.intercom.trim() }),
        ...(form.notes?.trim() && { notes: form.notes.trim() }),
        ...(form.rooms != null && { rooms: form.rooms }),
        ...(form.bathrooms != null && { bathrooms: form.bathrooms }),
        ...(form.housing_type && { housing_type: form.housing_type }),
        ...(form.latitude != null && { latitude: form.latitude }),
        ...(form.longitude != null && { longitude: form.longitude }),
      }
      await onSubmit(payload)
      onBack()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('err_save'))
    } finally {
      setLoading(false)
    }
  }

  const isEdit = !!initial

  return (
    <div class="min-h-screen bg-gray-50 flex flex-col">
      <div class="bg-white px-4 py-5 border-b border-gray-100 relative flex items-center justify-center">
        <button type="button" onClick={onBack} class="absolute left-4 w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 text-lg font-light active:bg-gray-200 transition-colors">
          ‹
        </button>
        <h1 class="text-base font-bold text-gray-900">
          {isEdit ? t('addr_title_edit') : t('addr_title_new')}
        </h1>
      </div>

      <form onSubmit={handleSubmit} class="flex-1 flex flex-col px-4 py-5 gap-4 pb-2">
        <Field
          label={t('addr_name_label')}
          placeholder={t('addr_name_placeholder')}
          value={form.label ?? ''}
          onChange={v => setForm(prev => ({ ...prev, label: v }))}
        />

        <div class="flex flex-col gap-2">
          <div class="flex items-center justify-between">
            <span class="text-xs font-medium text-gray-500">{t('addr_map_hint')}</span>
            <button
              type="button"
              onClick={() => setShowMap(v => !v)}
              class="text-xs text-blue-600 font-medium"
            >
              {showMap ? t('addr_map_hide') : t('addr_map_show')}
            </button>
          </div>
          {showMap && (
            <div class="flex flex-col gap-2">
              <MapPicker
                onLocationPick={handleLocationPick}
                initialLat={initial?.latitude}
                initialLon={initial?.longitude}
              />
              {geocoding && (
                <p class="text-xs text-gray-400">{t('addr_geocoding')}</p>
              )}
            </div>
          )}
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-medium text-gray-500">{t('addr_label')}</label>
            <input
              type="text"
              placeholder={t('addr_placeholder')}
              value={form.address}
              onInput={e => setField('address', (e.target as HTMLInputElement).value)}
              class="bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-400"
            />
          </div>
        </div>
        <div class="flex flex-col gap-2">
          <label class="text-xs font-medium text-gray-500">{t('addr_housing_type')}</label>
          <div class="flex gap-2">
            {(['apt', 'house'] as HousingType[]).map(id => {
              const active = form.housing_type === id
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setForm(prev => ({ ...prev, housing_type: prev.housing_type === id ? undefined : id }))}
                  class={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-medium border-2 transition-colors ${
                    active
                      ? 'border-[#44973A] bg-[#F0F9EE] text-[#2D6126]'
                      : 'border-gray-200 bg-white text-gray-700'
                  }`}
                >
                  {id === 'apt' ? (
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                      <rect x="2" y="3" width="14" height="13" rx="1.5" stroke="currentColor" stroke-width="1.5"/>
                      <path d="M6 16v-4h6v4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                      <rect x="5" y="6" width="2.5" height="2.5" rx="0.5" fill="currentColor"/>
                      <rect x="10.5" y="6" width="2.5" height="2.5" rx="0.5" fill="currentColor"/>
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                      <path d="M2 8.5L9 2l7 6.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                      <path d="M4 7.5V15a1 1 0 001 1h8a1 1 0 001-1V7.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                      <rect x="7" y="11" width="4" height="5" rx="0.5" stroke="currentColor" stroke-width="1.5"/>
                    </svg>
                  )}
                  {id === 'apt' ? t('housing_apt') : t('housing_house')}
                </button>
              )
            })}
          </div>
        </div>

        {form.housing_type === 'apt' && (
          <>
            <div class="grid grid-cols-2 gap-3">
              <Field
                label={t('addr_entrance_label') + '*'}
                placeholder={t('addr_entrance_placeholder')}
                value={form.entrance ?? ''}
                onChange={v => setField('entrance', v)}
              />
              <Field
                label={t('addr_floor_label') + '*'}
                placeholder={t('addr_floor_placeholder')}
                value={form.floor ?? ''}
                onChange={v => setField('floor', v)}
              />
            </div>
            <div class="grid grid-cols-2 gap-3">
              <Field
                label={t('addr_apt_label') + '*'}
                placeholder={t('addr_apt_placeholder')}
                value={form.apartment ?? ''}
                onChange={v => setField('apartment', v)}
              />
              <Field
                label={t('addr_intercom_label')}
                placeholder={t('addr_intercom_placeholder')}
                value={form.intercom ?? ''}
                onChange={v => setField('intercom', v)}
              />
            </div>
          </>
        )}

        <div class="flex flex-col gap-3">
          <CounterField
            label={t('addr_rooms_label')}
            value={form.rooms ?? null}
            min={1}
            max={10}
            onChange={v => setCount('rooms', v)}
          />
          <CounterField
            label={t('addr_bathrooms_label')}
            value={form.bathrooms ?? null}
            min={1}
            max={5}
            onChange={v => setCount('bathrooms', v)}
          />
        </div>

        <Field
          label={t('addr_notes_label')}
          placeholder={t('addr_notes_placeholder')}
          value={form.notes ?? ''}
          onChange={v => setField('notes', v)}
        />

        {error && <p class="text-red-500 text-sm">{error}</p>}

      </form>
      <div class="sticky bottom-0 px-4 pt-3 pb-8 bg-gray-50 border-t border-gray-100">
        <button
          type="button"
          disabled={loading}
          onClick={e => handleSubmit(e as unknown as Event)}
          class="w-full disabled:opacity-40 text-white font-medium py-3.5 rounded-xl transition-colors"
          style="background:#44973A"
        >
          {loading ? t('btn_saving') : isEdit ? t('btn_save') : t('btn_add')}
        </button>
      </div>
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
