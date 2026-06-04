import { useEffect, useRef, useState } from 'preact/hooks'
import type { User } from '../types'
import type { Address } from '../api/addresses'
import { createAddress, getAddresses } from '../api/addresses'
import type { HandymanWork } from '../api/addons'
import { getHandymanWorks } from '../api/addons'
import { createHandymanOrder } from '../api/orders'
import { uploadOrderAttachment } from '../api/attachments'
import { useLocale } from '../i18n'
import type { Lang } from '../i18n/locales'
import { CalendarPicker } from '../components/CalendarPicker'
import { BottomSheet } from '../components/BottomSheet'
import { AddressOption } from '../components/AddressOption'
import { AddressFormScreen } from './AddressFormScreen'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Draft {
  addressId: string
  address: string
  addressDetails: string
  orderDate: string
  orderSlot: string
  works: string[]
  comment: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TZ_OFFSET = 5
const DRAFT_KEY = 'alfaclean_handyman_draft'
const BASE_PRICE = 50000

const EMPTY_DRAFT: Draft = {
  addressId: '',
  address: '',
  addressDetails: '',
  orderDate: '',
  orderSlot: '',
  works: [],
  comment: '',
}

// ─── Pricing ──────────────────────────────────────────────────────────────────

function calcPrice(addonsList: HandymanWork[], selectedHandymanWorks: string[]): number {
  const addonsTotal = addonsList
    .filter(a => selectedHandymanWorks.includes(a.id))
    .reduce((s, a) => s + a.price, 0)
  return BASE_PRICE + addonsTotal
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
    const saved = parsed?.draft
    if (!saved) return null
    return { ...EMPTY_DRAFT, ...saved, works: saved.works ?? saved.addons ?? [] }
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

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      class={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
        active ? 'bg-[#44973A] text-white' : 'bg-gray-100 text-gray-700 active:bg-gray-200'
      }`}
    >
      {label}
    </button>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  user: User
  onBack: () => void
}

const MAX_ATTACH_SIZE = 20 * 1024 * 1024
const MAX_ATTACH_COUNT = 10

export function HandymanOrderScreen({ user, onBack }: Props) {
  const { t, lang } = useLocale()
  const [draft, setDraft] = useState<Draft>(loadSavedDraft() ?? EMPTY_DRAFT)
  const [addons, setHandymanWorks] = useState<HandymanWork[]>([])
  const [savedAddresses, setSavedAddresses] = useState<Address[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [showCalendar, setShowCalendar] = useState(false)
  const [showAddressSheet, setShowAddressSheet] = useState(false)
  const [showAddressDropdown, setShowAddressDropdown] = useState(false)
  const [done, setDone] = useState(false)
  const [attachments, setAttachments] = useState<File[]>([])
  const [previewUrls, setPreviewUrls] = useState<string[]>([])
  const [mediaError, setMediaError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    getHandymanWorks().catch(() => []).then(a => setHandymanWorks(Array.isArray(a) ? a : []))
    getAddresses(user.telegram_id).catch(() => []).then(a => setSavedAddresses(Array.isArray(a) ? a : []))
  }, [user.telegram_id])

  function patch(fields: Partial<Draft>) {
    setDraft(prev => {
      const next = { ...prev, ...fields }
      saveDraft(next)
      return next
    })
  }

  function handleFilesSelected(e: Event) {
    const input = e.target as HTMLInputElement
    const files = Array.from(input.files ?? [])
    input.value = ''
    setMediaError(null)

    const remaining = MAX_ATTACH_COUNT - attachments.length
    if (remaining <= 0) return

    const valid: File[] = []
    for (const f of files.slice(0, remaining)) {
      if (f.size > MAX_ATTACH_SIZE) {
        setMediaError(t('handyman_media_size_error'))
        continue
      }
      if (!f.type.startsWith('image/') && !f.type.startsWith('video/')) {
        setMediaError(t('handyman_media_type_error'))
        continue
      }
      valid.push(f)
    }
    if (valid.length === 0) return

    const urls = valid.map(f => URL.createObjectURL(f))
    setAttachments(prev => [...prev, ...valid])
    setPreviewUrls(prev => [...prev, ...urls])
  }

  function removeAttachment(idx: number) {
    URL.revokeObjectURL(previewUrls[idx])
    setAttachments(prev => prev.filter((_, i) => i !== idx))
    setPreviewUrls(prev => prev.filter((_, i) => i !== idx))
    setMediaError(null)
  }

  async function handleAddressCreated(data: Parameters<typeof createAddress>[1]) {
    const newAddr = await createAddress(user.telegram_id, data)
    const updated = await getAddresses(user.telegram_id).catch(() => savedAddresses)
    setSavedAddresses(Array.isArray(updated) ? updated : savedAddresses)
    patch({
      addressId: newAddr.id,
      address: newAddr.address,
      addressDetails: newAddr.notes ?? '',
    })
    setShowAddressSheet(false)
  }

  const price = calcPrice(addons, draft.works)

  const tz = nowInTashkent()
  const todayIso = toISO(tz)
  const tomorrowIso = toISO(new Date(tz.getTime() + 86400000))
  const days = next14Days(t)
  const availableSet = new Set(days.map(d => d.iso))
  const slots = draft.orderDate ? availableSlots(draft.orderDate) : []
  const isOtherDate = !!draft.orderDate && draft.orderDate !== todayIso && draft.orderDate !== tomorrowIso

  const canSubmit = !!draft.addressId && !!draft.orderDate && !!draft.orderSlot &&
                    draft.works.length > 0 && !!draft.comment.trim()

  async function handleSubmit() {
    if (!canSubmit || submitting) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      const order = await createHandymanOrder({
        telegram_id: user.telegram_id,
        description: draft.comment.trim(),
        works: draft.works,
        address_id: draft.addressId,
        order_date: draft.orderDate,
        order_slot: draft.orderSlot,
        source: 'bot',
      })
      for (const file of attachments) {
        await uploadOrderAttachment(order.id, file, String(user.telegram_id)).catch(() => {})
      }
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
        <h1 class="text-base font-bold text-gray-900">{t('handyman_new_order')}</h1>
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
                  <p class="text-sm font-medium text-[#44973A] truncate">{draft.address}</p>
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
                    active={draft.address === addr.address}
                    onClick={() => {
                      patch({
                        addressId: addr.id,
                        address: addr.address,
                        addressDetails: addr.notes ?? '',
                      })
                      setShowAddressDropdown(false)
                    }}
                  />
                ))}
                <button
                  type="button"
                  onClick={() => { setShowAddressDropdown(false); setShowAddressSheet(true) }}
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

        {/* Дата и время */}
        <div>
          <SectionLabel>{t('step_datetime')}</SectionLabel>
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

        {/* Дополнения */}
        {addons.length > 0 && (
          <div>
            <SectionLabel>{t('step_addons')}</SectionLabel>
            <div class="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
              {addons.map(addon => {
                const on = draft.works.includes(addon.id)
                return (
                  <button
                    key={addon.id}
                    type="button"
                    onClick={() => patch({
                      addons: on
                        ? draft.works.filter(x => x !== addon.id)
                        : [...draft.works, addon.id],
                    })}
                    class="w-full flex items-center justify-between px-4 py-3.5 transition-colors active:bg-gray-50 text-left"
                  >
                    <div class="flex-1 min-w-0">
                      <p class={`text-sm font-medium ${on ? 'text-[#2D6126]' : 'text-gray-900'}`}>
                        {addon.translations[lang] ?? addon.translations['ru'] ?? addon.id}
                      </p>
                      {(addon.description_translations[lang] ?? addon.description_translations['ru']) && (
                        <p class="text-xs text-gray-400 mt-0.5">
                          {addon.description_translations[lang] ?? addon.description_translations['ru']}
                        </p>
                      )}
                    </div>
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

        {/* Комментарий + вложения */}
        <div>
          <SectionLabel>{t('handyman_comment_label')}</SectionLabel>
          <div class="bg-white border border-gray-200 rounded-2xl overflow-hidden focus-within:border-[#44973A] transition-colors">
            <textarea
              rows={3}
              placeholder={t('handyman_comment_placeholder')}
              value={draft.comment}
              onInput={e => patch({ comment: (e.target as HTMLTextAreaElement).value })}
              class="w-full px-4 pt-3 pb-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none resize-none bg-transparent"
            />
            {previewUrls.length > 0 && (
              <div class="flex gap-2 overflow-x-auto px-3 pb-2">
                {previewUrls.map((url, idx) => {
                  const isVideo = attachments[idx]?.type.startsWith('video/')
                  return (
                    <div key={url} class="relative shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-gray-100">
                      {isVideo ? (
                        <video src={url} muted preload="metadata" class="w-full h-full object-cover" />
                      ) : (
                        <img src={url} alt="" class="w-full h-full object-cover" />
                      )}
                      <button
                        type="button"
                        onClick={() => removeAttachment(idx)}
                        class="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/60 flex items-center justify-center"
                      >
                        <svg width="6" height="6" viewBox="0 0 8 8" fill="none">
                          <path d="M1 1l6 6M7 1L1 7" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
                        </svg>
                      </button>
                      {isVideo && (
                        <div class="absolute bottom-0.5 left-0.5 w-4 h-4 rounded-full bg-black/50 flex items-center justify-center">
                          <svg width="6" height="7" viewBox="0 0 8 9" fill="none">
                            <path d="M1.5 1.5l5 3-5 3V1.5z" fill="white"/>
                          </svg>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
            <div class="flex items-center justify-between px-3 pb-2 pt-1 border-t border-gray-100">
              {mediaError ? (
                <p class="text-xs text-red-500">{mediaError}</p>
              ) : (
                <span class="text-xs text-gray-300">
                  {attachments.length > 0 ? `${attachments.length} / ${MAX_ATTACH_COUNT}` : ''}
                </span>
              )}
              {attachments.length < MAX_ATTACH_COUNT && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  class="w-8 h-8 flex items-center justify-center rounded-full active:bg-gray-100 transition-colors text-gray-400 active:text-gray-600"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66L9.41 17.41a2 2 0 01-2.83-2.83l8.49-8.48" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </button>
              )}
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            multiple
            class="hidden"
            onChange={handleFilesSelected}
          />
        </div>

        {submitError && (
          <p class="text-red-500 text-sm text-center">{submitError}</p>
        )}

        <div class="h-4" />
      </div>

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
