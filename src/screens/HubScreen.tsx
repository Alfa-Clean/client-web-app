import { useEffect, useRef, useState } from 'preact/hooks'
import { Sparkles, User as UserIcon, Sun, Moon, MessageCircle, ChevronRight, Shirt, Pencil, Trash2, Plus, Wrench } from 'lucide-react'
import type { User } from '../types'
import type { Order, HandymanOrder } from '../api/orders'
import { getUserOrders, getActiveHandymanOrders, getHandymanOrderHistory } from '../api/orders'
import { getAddresses, createAddress, updateAddress, deleteAddress } from '../api/addresses'
import type { Address, AddressPayload } from '../api/addresses'

import { useLocale } from '../i18n'
import type { Lang } from '../i18n/locales'

type TFunc = (key: string, params?: Record<string, string | number>) => string
import { getTheme, setTheme } from '../hooks/useTheme'
import { hasSeenOnboarding, markOnboardingSeen, resetOnboarding } from '../hooks/useOnboarding'
import { clearAllUserData } from '../api/client'
import { updateLanguage } from '../api/clients'
import { BottomSheet } from '../components/BottomSheet'
import { OnboardingOverlay } from '../components/OnboardingOverlay'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { useConfirm } from '../hooks/useConfirm'
import { AddressFormScreen } from './AddressFormScreen'
import { OrderScreen } from './OrderScreen'
import { HandymanOrderScreen } from './HandymanOrderScreen'
import { ChistomatyScreen } from './ChistomatyScreen'
import { ActiveOrderScreen } from './ActiveOrderScreen'
import { HouseOrderStatusScreen } from './HouseOrderStatusScreen'
import { ChatScreen } from './ChatScreen'
import { ActiveChistomatyScreen } from './ActiveChistomatyScreen'
import { ActiveHandymanOrderScreen } from './ActiveHandymanOrderScreen'
import { OrderEditScreen } from './OrderEditScreen'
import { HandymanOrderEditScreen } from './HandymanOrderEditScreen'
import { SupportScreen } from './SupportScreen'
import type { ChistomatyOrder } from './ActiveChistomatyScreen'
import { CHISTOMATY_STATUS_LABEL_KEYS } from './ActiveChistomatyScreen'
import { Logo } from '../components/Logo'

const ACTIVE_STATUSES = new Set([
  'new', 'assigned', 'on_the_way', 'arrived', 'in_progress', 'awaiting_confirmation',
  'assessment', 'price_submitted', 'price_rejected', 'team_formation', 'disputed',
])

const HISTORY_STATUSES = new Set(['completed', 'cancelled'])

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  completed: { bg: '#F3F9F9', text: '#1F847B' },
  cancelled:  { bg: '#FEF2F2', text: '#EF4444' },
}

const STATUS_HISTORY_LABEL_KEYS: Record<string, string> = {
  completed: 'status_completed',
  cancelled: 'status_cancelled',
}

function formatOrderDate(dateStr: string): string {
  return new Intl.DateTimeFormat('ru', {
    day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
    timeZone: 'Asia/Tashkent',
  }).format(new Date(dateStr))
}

function formatPrice(price: number, currency: string): string {
  return price.toLocaleString('ru') + ' ' + currency
}

const STATUS_LABEL_KEYS: Record<string, string> = {
  new:                   'hub_banner_status_new',
  assigned:              'hub_banner_status_assigned',
  on_the_way:            'hub_banner_status_on_the_way',
  arrived:               'hub_banner_status_arrived',
  in_progress:           'hub_banner_status_in_progress',
  awaiting_confirmation: 'hub_banner_status_awaiting_confirmation',
  assessment:            'hub_banner_status_assessment',
  price_submitted:       'hub_banner_status_price_submitted',
  price_rejected:        'hub_banner_status_price_rejected',
  team_formation:        'hub_banner_status_team_formation',
  disputed:              'hub_banner_status_disputed',
}

// ─── Active Order Banner ──────────────────────────────────────────────────────

export function ActiveOrderBanner({ order, onClick }: { order: Order; onClick: () => void }) {
  const { t } = useLocale()
  const label = STATUS_LABEL_KEYS[order.status] ? t(STATUS_LABEL_KEYS[order.status]) : t('home_active_order_fallback')
  const isDisputed = order.status === 'disputed'
  return (
    <button
      type="button"
      onClick={onClick}
      class={`mx-4 mb-4 w-[calc(100%-32px)] rounded-2xl px-4 py-3.5 flex items-center gap-3 active:opacity-90 transition-opacity text-left ${isDisputed ? 'bg-red-500' : 'bg-[#1F847B]'}`}
    >
      <div class="w-10 h-10 shrink-0 flex items-center justify-center relative">
        {order.status === 'new' ? (
          <div class="relative w-10 h-10 flex items-center justify-center">
            <div class="absolute inset-0 rounded-full bg-white/20 animate-ping" />
            <div class="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center animate-pulse" style="color:white">
              <Sparkles size={20} />
            </div>
          </div>
        ) : (
          <div class="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center" style="color:white">
            <Sparkles size={20} />
          </div>
        )}
      </div>
      <div class="flex-1 min-w-0">
        <p class="text-white font-bold text-sm leading-tight">{label}</p>
        <p class="text-white/70 text-xs truncate mt-0.5">{order.address}</p>
      </div>
      <span class="text-white/60 text-xl leading-none shrink-0">›</span>
    </button>
  )
}

// ─── Chistomaty Order Banner ──────────────────────────────────────────────────

export function ChistomatyOrderBanner({ order, onClick }: { order: ChistomatyOrder; onClick: () => void }) {
  const { t } = useLocale()
  const label = t(CHISTOMATY_STATUS_LABEL_KEYS[order.status])
  return (
    <button
      type="button"
      onClick={onClick}
      class="mx-4 mb-4 w-[calc(100%-32px)] bg-blue-600 rounded-2xl px-4 py-3.5 flex items-center gap-3 active:opacity-90 transition-opacity text-left"
    >
      <div class="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
        <Shirt size={20} class="text-white" />
      </div>
      <div class="flex-1 min-w-0">
        <p class="text-white/60 text-[10px] font-medium mb-0.5">{t('nav_chistomaty')}</p>
        <p class="text-white font-bold text-sm leading-tight">{label}</p>
        <p class="text-white/70 text-xs truncate mt-0.5">{order.postamat_address}</p>
      </div>
      <span class="text-white/60 text-xl leading-none shrink-0">›</span>
    </button>
  )
}

// ─── Handyman Order Banner ────────────────────────────────────────────────────

const HANDYMAN_STATUS_LABEL_KEYS: Record<string, string> = {
  new:                   'handyman_status_new',
  assigned:              'handyman_status_assigned',
  on_the_way:            'handyman_status_on_the_way',
  arrived:               'handyman_status_arrived',
  in_progress:           'handyman_status_in_progress',
  awaiting_confirmation: 'handyman_status_awaiting_confirmation',
  disputed:              'handyman_status_disputed',
}

export function HandymanOrderBanner({ order, onClick }: { order: HandymanOrder; onClick: () => void }) {
  const { t } = useLocale()
  const label = HANDYMAN_STATUS_LABEL_KEYS[order.status] ? t(HANDYMAN_STATUS_LABEL_KEYS[order.status]) : t('home_active_order_fallback')
  const isDisputed = order.status === 'disputed'
  return (
    <button
      type="button"
      onClick={onClick}
      class={`mx-4 mb-4 w-[calc(100%-32px)] rounded-2xl px-4 py-3.5 flex items-center gap-3 active:opacity-90 transition-opacity text-left ${isDisputed ? 'bg-red-500' : 'bg-amber-500'}`}
    >
      <div class="w-10 h-10 shrink-0 flex items-center justify-center">
        {order.status === 'new' ? (
          <div class="relative w-10 h-10 flex items-center justify-center">
            <div class="absolute inset-0 rounded-full bg-white/20 animate-ping" />
            <div class="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center animate-pulse" style="color:white">
              <Wrench size={20} />
            </div>
          </div>
        ) : (
          <div class="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center" style="color:white">
            <Wrench size={20} />
          </div>
        )}
      </div>
      <div class="flex-1 min-w-0">
        <p class="text-white font-bold text-sm leading-tight">{label}</p>
        <p class="text-white/70 text-xs truncate mt-0.5">{order.address}</p>
      </div>
      <span class="text-white/60 text-xl leading-none shrink-0">›</span>
    </button>
  )
}

// ─── Combined Active Orders Banner ───────────────────────────────────────────

function pluralOrders(n: number, t: TFunc, lang: Lang): string {
  if (lang === 'ru') {
    if (n % 10 === 1 && n % 100 !== 11) return t('active_orders_count_one', { n })
    if (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)) return t('active_orders_count_few', { n })
    return t('active_orders_count_many', { n })
  }
  if (lang === 'en') return t(n === 1 ? 'active_orders_count_one' : 'active_orders_count_few', { n })
  return t('active_orders_count_few', { n })
}

function CombinedOrdersBanner({ count, onClick }: { count: number; onClick: () => void }) {
  const { t, lang } = useLocale()
  return (
    <button
      type="button"
      onClick={onClick}
      class="mx-4 mb-4 w-[calc(100%-32px)] bg-gray-900 rounded-2xl px-4 py-3.5 flex items-center gap-3 active:opacity-90 transition-opacity text-left"
    >
      <div class="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
        <span class="text-white font-bold text-lg leading-none">{count}</span>
      </div>
      <div class="flex-1 min-w-0">
        <p class="text-white font-bold text-sm leading-tight">{pluralOrders(count, t, lang)}</p>
        <p class="text-white/60 text-xs mt-0.5">{t('hub_tap_to_view_all')}</p>
      </div>
      <span class="text-white/60 text-xl leading-none shrink-0">›</span>
    </button>
  )
}

// ─── Order History Item ───────────────────────────────────────────────────────

function OrderHistoryItem({ order, onClick }: { order: Order; onClick: () => void }) {
  const { t } = useLocale()
  const c = STATUS_COLORS[order.status] ?? { bg: '#F3F4F6', text: '#6B7280' }
  const label = STATUS_HISTORY_LABEL_KEYS[order.status] ? t(STATUS_HISTORY_LABEL_KEYS[order.status]) : order.status
  return (
    <button
      type="button"
      onClick={onClick}
      class="w-full bg-white rounded-2xl border border-gray-100 px-4 py-3.5 flex items-center gap-3 text-left active:bg-gray-50 transition-colors"
    >
      <div
        class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: c.bg }}
      >
        <Sparkles size={18} style={{ color: c.text }} />
      </div>
      <div class="flex-1 min-w-0">
        <div class="flex items-center justify-between gap-2">
          <p class="text-sm font-semibold text-gray-900">{t('onboarding_cleaning_title')}</p>
          <span
            class="text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0"
            style={{ background: c.bg, color: c.text }}
          >
            {label}
          </span>
        </div>
        <p class="text-xs text-gray-500 truncate mt-0.5">{order.address}</p>
        <div class="flex items-center justify-between mt-1">
          <p class="text-[11px] text-gray-400">{formatOrderDate(order.order_date)}</p>
          <p class="text-sm font-semibold text-gray-900">{formatPrice(order.price, t('currency'))}</p>
        </div>
      </div>
      <ChevronRight size={16} class="text-gray-300 shrink-0" />
    </button>
  )
}

function HandymanHistoryItem({ order, onClick }: { order: HandymanOrder; onClick: () => void }) {
  const { t } = useLocale()
  const c = STATUS_COLORS[order.status] ?? { bg: '#F3F4F6', text: '#6B7280' }
  const label = STATUS_HISTORY_LABEL_KEYS[order.status] ? t(STATUS_HISTORY_LABEL_KEYS[order.status]) : order.status
  return (
    <button
      type="button"
      onClick={onClick}
      class="w-full bg-white rounded-2xl border border-gray-100 px-4 py-3.5 flex items-center gap-3 text-left active:bg-gray-50 transition-colors"
    >
      <div
        class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: c.bg }}
      >
        <Wrench size={18} style={{ color: c.text }} />
      </div>
      <div class="flex-1 min-w-0">
        <div class="flex items-center justify-between gap-2">
          <p class="text-sm font-semibold text-gray-900">{t('onboarding_handyman_title')}</p>
          <span
            class="text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0"
            style={{ background: c.bg, color: c.text }}
          >
            {label}
          </span>
        </div>
        <p class="text-xs text-gray-500 truncate mt-0.5">{order.address}</p>
        <div class="flex items-center justify-between mt-1">
          <p class="text-[11px] text-gray-400">{formatOrderDate(order.order_date)}</p>
          <p class="text-sm font-semibold text-gray-900">{formatPrice(order.price, t('currency'))}</p>
        </div>
      </div>
      <ChevronRight size={16} class="text-gray-300 shrink-0" />
    </button>
  )
}

// ─── Menu Screen ─────────────────────────────────────────────────────────────

const LANGS: { id: Lang; flag: string; label: string }[] = [
  { id: 'ru', flag: '🇷🇺', label: 'Русский' },
  { id: 'uz', flag: '🇺🇿', label: "O'zbek" },
  { id: 'en', flag: '🇬🇧', label: 'English' },
]

function ProfileAvatar({ firstName, lastName, photoUrl }: { firstName: string; lastName?: string; photoUrl?: string }) {
  const [failed, setFailed] = useState(false)
  const initials = `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.toUpperCase()

  if (photoUrl && !failed) {
    return (
      <img
        src={photoUrl}
        alt=""
        onError={() => setFailed(true)}
        class="w-14 h-14 rounded-full object-cover shrink-0 bg-gray-100"
      />
    )
  }

  return (
    <div class="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
      {initials
        ? <span class="text-lg font-semibold text-blue-500">{initials}</span>
        : <UserIcon size={24} class="text-blue-500" />}
    </div>
  )
}

function MenuScreen({ user, onBack, onSupportClick, onStartOnboarding, onStartCleaningOnboarding, onStartHandymanOnboarding }: { user: User; onBack: () => void; onSupportClick: () => void; onStartOnboarding: () => void; onStartCleaningOnboarding: () => void; onStartHandymanOnboarding: () => void }) {
  const { t, lang, setLang } = useLocale()
  const [theme, setThemeState] = useState(getTheme())
  const [addresses, setAddresses] = useState<Address[]>([])
  const [addressSheet, setAddressSheet] = useState<null | 'new' | Address>(null)
  const { confirm, dialogProps } = useConfirm()

  useEffect(() => {
    getAddresses(user.telegram_id).then(setAddresses).catch(() => {})
  }, [user.telegram_id])

  function toggleTheme(next: 'light' | 'dark') {
    setTheme(next)
    setThemeState(next)
  }

  async function handleAddressSubmit(data: AddressPayload) {
    if (addressSheet === 'new') {
      const created = await createAddress(user.telegram_id, data)
      setAddresses(prev => [...prev, created])
    } else if (addressSheet !== null) {
      const updated = await updateAddress(user.telegram_id, addressSheet.id, data)
      setAddresses(prev => prev.map(a => a.id === updated.id ? updated : a))
    }
  }

  async function handleDelete(addr: Address) {
    const ok = await confirm(t('home_delete_confirm').replace('{address}', addr.label || addr.address), { confirmVariant: 'danger' })
    if (!ok) return
    await deleteAddress(user.telegram_id, addr.id).catch(() => {})
    setAddresses(prev => prev.filter(a => a.id !== addr.id))
  }

  async function handleLogout() {
    const ok = await confirm(t('menu_logout_confirm'), {
      title: t('menu_logout_title'),
      confirmVariant: 'danger',
      confirmLabel: t('menu_logout'),
    })
    if (!ok) return
    clearAllUserData()
    window.location.reload()
  }

  return (
    <div class="min-h-screen bg-gray-50 flex flex-col">
      <ConfirmDialog
        {...dialogProps}
        confirmLabel={dialogProps.confirmLabel ?? t('dialog_ok')}
        cancelLabel={dialogProps.cancelLabel ?? t('dialog_cancel')}
      />

      <BottomSheet open={addressSheet !== null} onClose={() => setAddressSheet(null)}>
        {addressSheet !== null && (
          <AddressFormScreen
            initial={addressSheet === 'new' ? undefined : addressSheet}
            onSubmit={handleAddressSubmit}
            onBack={() => setAddressSheet(null)}
          />
        )}
      </BottomSheet>

      {/* Header */}
      <div class="bg-white px-5 pt-12 pb-5 flex items-center gap-4 border-b border-gray-100">
        <button
          type="button"
          onClick={onBack}
          class="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center active:bg-gray-200 transition-colors text-gray-600 text-lg font-light"
        >
          ‹
        </button>
        <p class="text-xl font-bold text-gray-900">{t('menu_title')}</p>
      </div>

      <div class="flex-1 px-4 py-5 flex flex-col gap-4">
        {/* User info */}
        <div class="bg-white rounded-2xl px-4 py-4 border border-gray-100 flex items-center gap-4">
          <ProfileAvatar
            firstName={user.first_name}
            lastName={user.last_name}
            photoUrl={(window as any).Telegram?.WebApp?.initDataUnsafe?.user?.photo_url}
          />
          <div class="flex-1 min-w-0">
            <p class="text-base font-semibold text-gray-900 truncate">{user.first_name}{user.last_name ? ` ${user.last_name}` : ''}</p>
            {user.phone
              ? <p class="text-sm text-gray-400 mt-0.5">{user.phone}</p>
              : <p class="text-sm text-gray-300 mt-0.5">{t('profile_no_phone')}</p>}
          </div>
        </div>

        {/* Addresses */}
        <div class="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div class="px-4 pt-4 pb-2 flex items-center justify-between">
            <p class="text-xs font-semibold text-gray-400 uppercase tracking-widest">{t('home_saved_addresses')}</p>
            <button
              type="button"
              onClick={() => setAddressSheet('new')}
              class="flex items-center gap-1 text-xs font-medium text-green-800 active:opacity-70 transition-opacity"
            >
              <Plus size={14} />
              {t('btn_add')}
            </button>
          </div>
          {addresses.length === 0 ? (
            <p class="px-4 pb-4 text-sm text-gray-400">{t('home_no_addresses')}</p>
          ) : (
            addresses.map(addr => (
              <div key={addr.id} class="flex items-center gap-2 px-4 py-3 border-t border-gray-50">
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium text-gray-900 truncate">{addr.label || addr.address}</p>
                  {addr.label && <p class="text-xs text-gray-400 truncate mt-0.5">{addr.address}</p>}
                </div>
                <button
                  type="button"
                  onClick={() => setAddressSheet(addr)}
                  class="w-8 h-8 flex items-center justify-center rounded-xl text-gray-400 active:bg-gray-100 transition-colors shrink-0"
                >
                  <Pencil size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(addr)}
                  class="w-8 h-8 flex items-center justify-center rounded-xl text-red-400 active:bg-red-50 transition-colors shrink-0"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Theme */}
        <div class="bg-white rounded-2xl px-4 py-4 border border-gray-100">
          <p class="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">{t('settings_theme_label')}</p>
          <div class="flex gap-2">
            <button
              type="button"
              onClick={() => toggleTheme('light')}
              class={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 text-sm font-medium transition-colors ${
                theme === 'light'
                  ? 'border-green-600 bg-green-50 text-green-800'
                  : 'border-gray-200 bg-gray-50 text-gray-500'
              }`}
            >
              <Sun size={16} />
              {t('theme_light')}
            </button>
            <button
              type="button"
              onClick={() => toggleTheme('dark')}
              class={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 text-sm font-medium transition-colors ${
                theme === 'dark'
                  ? 'border-green-600 bg-green-50 text-green-800'
                  : 'border-gray-200 bg-gray-50 text-gray-500'
              }`}
            >
              <Moon size={16} />
              {t('theme_dark')}
            </button>
          </div>
        </div>

        {/* Language */}
        <div class="bg-white rounded-2xl px-4 py-4 border border-gray-100">
          <p class="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">{t('settings_language')}</p>
          <div class="flex gap-2">
            {LANGS.map(({ id, flag, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => { setLang(id); updateLanguage(user.telegram_id, id).catch(() => {}) }}
                class={`flex-1 flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 transition-colors ${
                  lang === id
                    ? 'border-green-600 bg-green-50'
                    : 'border-gray-200 bg-gray-50'
                }`}
              >
                <span class="text-2xl leading-none">{flag}</span>
                <span class={`text-xs font-medium ${lang === id ? 'text-green-800' : 'text-gray-500'}`}>
                  {label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Support */}
        <div class="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <button
            type="button"
            onClick={onSupportClick}
            class="w-full flex items-center gap-3 px-4 py-4 active:bg-gray-50 transition-colors text-left"
          >
            <div class="w-9 h-9 rounded-xl bg-green-100 flex items-center justify-center shrink-0">
              <MessageCircle size={18} class="text-green-800" />
            </div>
            <p class="flex-1 text-sm font-medium text-gray-900">{t('support_title')}</p>
            <ChevronRight size={16} class="text-gray-300" />
          </button>
        </div>

        {/* Dev-only: перезапуск онбординга */}
        {import.meta.env.DEV && (
          <div class="flex flex-col gap-2">
            <button
              type="button"
              onClick={onStartOnboarding}
              class="w-full border-2 border-blue-300 text-blue-600 font-medium py-3 rounded-2xl transition-all active:scale-95 text-sm"
            >
              {t('menu_dev_onboarding')}
            </button>
            <button
              type="button"
              onClick={onStartCleaningOnboarding}
              class="w-full border-2 border-blue-300 text-blue-600 font-medium py-3 rounded-2xl transition-all active:scale-95 text-sm"
            >
              {t('menu_dev_onboarding_cleaning')}
            </button>
            <button
              type="button"
              onClick={onStartHandymanOnboarding}
              class="w-full border-2 border-blue-300 text-blue-600 font-medium py-3 rounded-2xl transition-all active:scale-95 text-sm"
            >
              {t('menu_dev_onboarding_handyman')}
            </button>
          </div>
        )}

        {/* Logout */}
        <button
          type="button"
          onClick={handleLogout}
          class="w-full border-2 border-red-400 text-red-500 font-medium py-3.5 rounded-2xl transition-all active:scale-95 text-sm hover:bg-red-50"
        >
          {t('menu_logout')}
        </button>
      </div>
    </div>
  )
}

// ─── Active order entry ───────────────────────────────────────────────────────

type ActiveOrderEntry =
  | { type: 'cleaning';   order: Order }
  | { type: 'chistomaty'; order: ChistomatyOrder }
  | { type: 'handyman';   order: HandymanOrder }

// ─── Deep link parsing ────────────────────────────────────────────────────────

type DeepLink =
  | { type: 'wizard'; target: 'cleaning' | 'handyman' | 'chistomaty' }
  | { type: 'order'; id: string }
  | { type: 'handyman_order'; id: string }
  | { type: 'chat_cleaning'; id: string }
  | { type: 'chat_handyman'; id: string }

function parseDeepLink(param: string): DeepLink | null {
  if (!param) return null
  if (param === 'cleaning')  return { type: 'wizard', target: 'cleaning' }
  if (param === 'handyman')  return { type: 'wizard', target: 'handyman' }
  if (param === 'chistomaty') return { type: 'wizard', target: 'chistomaty' }
  if (param.startsWith('cleaning_chat_')) return { type: 'chat_cleaning', id: param.slice(14) }
  if (param.startsWith('handyman_chat_')) return { type: 'chat_handyman', id: param.slice(14) }
  if (param.startsWith('cleaning_')) return { type: 'order', id: param.slice(9) }
  if (param.startsWith('handyman_')) return { type: 'handyman_order', id: param.slice(9) }
  return null
}

// ─── Hub Screen ───────────────────────────────────────────────────────────────

type SupportBackView = 'hub' | 'menu' | 'active_order' | 'active_handyman' | 'active_chistomaty'
type SupportView = { name: 'support'; backView: SupportBackView }

type View =
  | 'hub' | 'cleaning' | 'handyman' | 'chistomaty' | 'menu' | 'active_order' | 'active_chistomaty' | 'active_handyman' | 'order_edit' | 'handyman_order_edit'
  | { name: 'chat'; orderId: string; contextType: 'cleaning_order' | 'handyman_order' | 'support' | 'cleaning_dispute' | 'handyman_dispute'; executorId: string | null; executorName: string; senderId: string; backView: 'active_order' | 'active_handyman' | SupportView }
  | SupportView

interface Props {
  user: User
  startParam?: string
}

export function HubScreen({ user, startParam = '' }: Props) {
  const { t } = useLocale()
  const deepLink = parseDeepLink(startParam)
  const initialView: View = deepLink?.type === 'wizard' ? deepLink.target : 'hub'

  const [view, setView] = useState<View>(initialView)
  const [activeOrders, setActiveOrders] = useState<Order[] | 'loading'>('loading')
  const [focusedOrder, setFocusedOrder] = useState<Order | null>(null)
  const [activeChistomatyOrder] = useState<ChistomatyOrder | null>(null)
  const [activeHandymanOrders, setActiveHandymanOrders] = useState<HandymanOrder[]>([])
  const [focusedHandymanOrder, setFocusedHandymanOrder] = useState<HandymanOrder | null>(null)
  const [showActiveSheet, setShowActiveSheet] = useState(false)
  const [historyOrders, setHistoryOrders] = useState<Order[]>([])
  const [historyHandymanOrders, setHistoryHandymanOrders] = useState<HandymanOrder[]>([])
  const [repeatCleaning, setRepeatCleaning] = useState<Order | null>(null)
  const [repeatHandyman, setRepeatHandyman] = useState<HandymanOrder | null>(null)
  const [detailFromHistory, setDetailFromHistory] = useState(false)
  const [addresses, setAddresses] = useState<Address[]>([])
  const [addressGateFor, setAddressGateFor] = useState<'cleaning' | 'handyman' | null>(null)
  const [gateCreatedAddress, setGateCreatedAddress] = useState<Address | null>(null)
  const [showOnboarding, setShowOnboarding] = useState(false)

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const deepLinkHandled = useRef(false)
  const menuBtnRef = useRef<HTMLButtonElement>(null)
  const cleaningTileRef = useRef<HTMLButtonElement>(null)
  const handymanTileRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (view === 'hub' && !hasSeenOnboarding('hub')) setShowOnboarding(true)
  }, [view])

  function finishOnboarding() {
    markOnboardingSeen('hub')
    setShowOnboarding(false)
  }

  useEffect(() => {
    getAddresses(user.telegram_id).then(setAddresses).catch(() => {})
    getUserOrders(user.telegram_id)
      .then(res => {
        const actives = res.items.filter(o => ACTIVE_STATUSES.has(o.status))
        setActiveOrders(actives)
        setHistoryOrders(res.items.filter(o => HISTORY_STATUSES.has(o.status)))
        if (actives.length > 0) startPolling()

        if (!deepLinkHandled.current && deepLink?.type === 'order') {
          deepLinkHandled.current = true
          const target = actives.find(o => o.id === deepLink.id)
          if (target) { setFocusedOrder(target); setView('active_order') }
        }
        if (!deepLinkHandled.current && deepLink?.type === 'chat_cleaning') {
          deepLinkHandled.current = true
          const target = actives.find(o => o.id === deepLink.id)
          if (target) {
            setFocusedOrder(target)
            setView({
              name: 'chat',
              orderId: target.id,
              contextType: 'cleaning_order',
              executorId: target.foreman_id ?? target.executor_id ?? null,
              executorName: target.foreman_name ?? target.executor_name ?? t('history_executor'),
              senderId: String(user.telegram_id),
              backView: 'active_order',
            })
          }
        }
      })
      .catch(() => setActiveOrders([]))
    getActiveHandymanOrders(user.telegram_id)
      .then(res => {
        const items = Array.isArray(res.items) ? res.items : []
        setActiveHandymanOrders(items)

        if (!deepLinkHandled.current && deepLink?.type === 'handyman_order') {
          deepLinkHandled.current = true
          const target = items.find(o => o.id === deepLink.id)
          if (target) { setFocusedHandymanOrder(target); setView('active_handyman') }
        }
        if (!deepLinkHandled.current && deepLink?.type === 'chat_handyman') {
          deepLinkHandled.current = true
          const target = items.find(o => o.id === deepLink.id)
          if (target) {
            setFocusedHandymanOrder(target)
            setView({
              name: 'chat',
              orderId: target.id,
              contextType: 'handyman_order',
              executorId: target.executor_id ?? null,
              executorName: target.executor_name ?? t('handyman_master_label'),
              senderId: String(user.telegram_id),
              backView: 'active_handyman',
            })
          }
        }
      })
      .catch(() => setActiveHandymanOrders([]))
    getHandymanOrderHistory(user.telegram_id)
      .then(res => setHistoryHandymanOrders(Array.isArray(res.items) ? res.items : []))
      .catch(() => setHistoryHandymanOrders([]))
    return stopPolling
  }, [user.telegram_id])

  function startPolling() {
    if (pollRef.current) return
    pollRef.current = setInterval(async () => {
      try {
        const res = await getUserOrders(user.telegram_id)
        const actives = res.items.filter(o => ACTIVE_STATUSES.has(o.status))
        setActiveOrders(actives)
        // Не обнуляем focusedOrder, если заказ просто вышел из "активных" (например, принят и стал completed) —
        // иначе фоновый поллинг может выбить пользователя с экрана заказа прямо во время открытого RatingSheet.
        // Переход на хаб делают явные колбэки onOrderDone/onOrderAccepted.
        setFocusedOrder(prev => {
          if (!prev) return null
          return actives.find(o => o.id === prev.id) ?? prev
        })
        if (actives.length === 0) stopPolling()
      } catch {}
    }, 12000)
  }

  function stopPolling() {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
  }

  function backToHub() {
    setView('hub')
    const total = (activeOrders !== 'loading' ? activeOrders.length : 0) + activeHandymanOrders.length
    if (total >= 3) setShowActiveSheet(true)
  }

  function refreshOrders() {
    getUserOrders(user.telegram_id)
      .then(res => {
        const actives = res.items.filter(o => ACTIVE_STATUSES.has(o.status))
        setActiveOrders(actives)
        setHistoryOrders(res.items.filter(o => HISTORY_STATUSES.has(o.status)))
        if (actives.length > 0) startPolling()
      })
      .catch(() => {})
    getActiveHandymanOrders(user.telegram_id)
      .then(res => { setActiveHandymanOrders(Array.isArray(res.items) ? res.items : []) })
      .catch(() => {})
    getHandymanOrderHistory(user.telegram_id)
      .then(res => setHistoryHandymanOrders(Array.isArray(res.items) ? res.items : []))
      .catch(() => {})
  }

  if (typeof view === 'object' && view.name === 'chat') {
    return (
      <ChatScreen
        orderId={view.orderId}
        contextType={view.contextType}
        executorId={view.executorId}
        executorName={view.executorName}
        senderId={view.senderId}
        onBack={() => setView(view.backView)}
      />
    )
  }

  if (typeof view === 'object' && view.name === 'support') {
    const supportBackView = view.backView
    return (
      <SupportScreen
        onBack={() => setView(supportBackView)}
        onOpenChat={() => setView({
          name: 'chat',
          orderId: 'support',
          contextType: 'support',
          executorId: null,
          executorName: t('support_title'),
          senderId: String(user.telegram_id),
          backView: { name: 'support', backView: supportBackView },
        })}
      />
    )
  }

  if (view === 'active_order' && focusedOrder) {
    const onOrderDone = () => {
      setActiveOrders(prev => prev === 'loading' ? [] : prev.filter(o => o.id !== focusedOrder.id))
      setFocusedOrder(null)
      setView('hub')
    }

    // Открытие из истории: общий экран деталей, без чата, с кнопкой «Повторить».
    if (detailFromHistory) {
      return (
        <ActiveOrderScreen
          order={focusedOrder}
          senderId={String(user.telegram_id)}
          onBack={() => { setDetailFromHistory(false); setFocusedOrder(null); setView('hub') }}
          onChatClick={() => {}}
          onOrderCancelled={() => {}}
          onOrderAccepted={() => {}}
          onSupportClick={() => setView({ name: 'support', backView: 'active_order' })}
          onEditClick={() => {}}
          onRepeat={() => { setRepeatCleaning(focusedOrder); setDetailFromHistory(false); setFocusedOrder(null); setView('cleaning') }}
        />
      )
    }

    if (focusedOrder.housing_type === 'house') {
      return (
        <HouseOrderStatusScreen
          order={focusedOrder}
          senderId={String(user.telegram_id)}
          onBack={backToHub}
          onChatClick={() => setView(focusedOrder.status === 'disputed' ? {
            name: 'chat',
            orderId: focusedOrder.id,
            contextType: 'cleaning_dispute',
            executorId: null,
            executorName: t('status_disputed'),
            senderId: String(user.telegram_id),
            backView: 'active_order',
          } : {
            name: 'chat',
            orderId: focusedOrder.id,
            contextType: 'cleaning_order',
            executorId: focusedOrder.foreman_id ?? null,
            executorName: focusedOrder.foreman_name ?? t('house_foreman_badge'),
            senderId: String(user.telegram_id),
            backView: 'active_order',
          })}
          onOrderCancelled={onOrderDone}
          onOrderAccepted={onOrderDone}
          onOrderUpdated={updated => {
            setFocusedOrder(updated)
            setActiveOrders(prev => prev === 'loading' ? [updated] : prev.map(o => o.id === updated.id ? updated : o))
          }}
          onEditClick={() => setView('order_edit')}
          onSupportClick={() => setView({ name: 'support', backView: 'active_order' })}
        />
      )
    }

    return (
      <ActiveOrderScreen
        order={focusedOrder}
        senderId={String(user.telegram_id)}
        onBack={backToHub}
        onChatClick={(orderId, executorId, executorName) => setView(focusedOrder.status === 'disputed' ? {
          name: 'chat',
          orderId,
          contextType: 'cleaning_dispute',
          executorId: null,
          executorName: t('status_disputed'),
          senderId: String(user.telegram_id),
          backView: 'active_order',
        } : {
          name: 'chat',
          orderId,
          contextType: focusedOrder.service_type === 'handyman' ? 'handyman_order' : 'cleaning_order',
          executorId,
          executorName,
          senderId: String(user.telegram_id),
          backView: 'active_order',
        })}
        onOrderCancelled={onOrderDone}
        onOrderAccepted={onOrderDone}
        onSupportClick={() => setView({ name: 'support', backView: 'active_order' })}
        onEditClick={() => setView('order_edit')}
        onOrderUpdated={updated => {
          setFocusedOrder(updated)
          setActiveOrders(prev => prev === 'loading' ? [updated] : prev.map(o => o.id === updated.id ? updated : o))
        }}
      />
    )
  }

  if (view === 'order_edit' && focusedOrder) {
    return (
      <OrderEditScreen
        order={focusedOrder}
        telegramId={user.telegram_id}
        onBack={() => setView('active_order')}
        onSaved={updated => {
          setFocusedOrder(updated)
          setActiveOrders(prev => prev === 'loading' ? [updated] : prev.map(o => o.id === updated.id ? updated : o))
          setView('active_order')
        }}
      />
    )
  }

  if (view === 'handyman_order_edit' && focusedHandymanOrder) {
    return (
      <HandymanOrderEditScreen
        order={focusedHandymanOrder}
        telegramId={user.telegram_id}
        onBack={() => setView('active_handyman')}
        onSaved={updated => {
          setFocusedHandymanOrder(updated)
          setActiveHandymanOrders(prev => prev.map(o => o.id === updated.id ? updated : o))
          setView('active_handyman')
        }}
      />
    )
  }

  if (view === 'active_chistomaty' && activeChistomatyOrder) {
    return (
      <ActiveChistomatyScreen
        order={activeChistomatyOrder}
        onBack={() => setView('hub')}
        onSupportClick={() => setView({ name: 'support', backView: 'active_chistomaty' })}
      />
    )
  }

  if (view === 'active_handyman' && focusedHandymanOrder) {
    const onHandymanDone = () => {
      setActiveHandymanOrders(prev => prev.filter(o => o.id !== focusedHandymanOrder.id))
      setFocusedHandymanOrder(null)
      setView('hub')
    }

    // Открытие из истории: тот же экран, без чата, с кнопкой «Повторить».
    if (detailFromHistory) {
      return (
        <ActiveHandymanOrderScreen
          order={focusedHandymanOrder}
          senderId={String(user.telegram_id)}
          onBack={() => { setDetailFromHistory(false); setFocusedHandymanOrder(null); setView('hub') }}
          onChatClick={() => {}}
          onOrderCancelled={() => {}}
          onOrderAccepted={() => {}}
          onSupportClick={() => setView({ name: 'support', backView: 'active_handyman' })}
          onRepeat={() => { setRepeatHandyman(focusedHandymanOrder); setDetailFromHistory(false); setFocusedHandymanOrder(null); setView('handyman') }}
        />
      )
    }

    return (
      <ActiveHandymanOrderScreen
        order={focusedHandymanOrder}
        senderId={String(user.telegram_id)}
        onBack={backToHub}
        onChatClick={(orderId, executorId, executorName) => setView(focusedHandymanOrder.status === 'disputed' ? {
          name: 'chat',
          orderId,
          contextType: 'handyman_dispute',
          executorId: null,
          executorName: t('status_disputed'),
          senderId: String(user.telegram_id),
          backView: 'active_handyman',
        } : {
          name: 'chat',
          orderId,
          contextType: 'handyman_order',
          executorId,
          executorName,
          senderId: String(user.telegram_id),
          backView: 'active_handyman',
        })}
        onOrderCancelled={onHandymanDone}
        onOrderAccepted={onHandymanDone}
        onSupportClick={() => setView({ name: 'support', backView: 'active_handyman' })}
        onEditClick={() => setView('handyman_order_edit')}
        onOrderUpdated={updated => {
          setFocusedHandymanOrder(updated)
          setActiveHandymanOrders(prev => prev.map(o => o.id === updated.id ? updated : o))
        }}
      />
    )
  }

  if (addressGateFor) {
    return (
      <AddressFormScreen
        onBack={() => setAddressGateFor(null)}
        onSubmit={async data => {
          const newAddr = await createAddress(user.telegram_id, data)
          const updated = await getAddresses(user.telegram_id).catch(() => addresses)
          setAddresses(Array.isArray(updated) ? updated : addresses)
          const target = addressGateFor
          setAddressGateFor(null)
          setGateCreatedAddress(newAddr)
          setView(target)
        }}
      />
    )
  }

  if (view === 'cleaning') {
    return (
      <OrderScreen
        user={user}
        repeatFrom={repeatCleaning}
        initialAddress={gateCreatedAddress}
        onBack={() => { setRepeatCleaning(null); setGateCreatedAddress(null); refreshOrders(); setView('hub') }}
      />
    )
  }

  if (view === 'handyman') {
    return (
      <HandymanOrderScreen
        user={user}
        repeatFrom={repeatHandyman}
        initialAddress={gateCreatedAddress}
        onBack={() => { setRepeatHandyman(null); setGateCreatedAddress(null); refreshOrders(); setView('hub') }}
      />
    )
  }

  if (view === 'chistomaty') {
    return <ChistomatyScreen onBack={() => setView('hub')} />
  }

  if (view === 'menu') {
    return (
      <MenuScreen
        user={user}
        onBack={() => setView('hub')}
        onSupportClick={() => setView({ name: 'support', backView: 'menu' })}
        onStartOnboarding={() => { resetOnboarding('hub'); setView('hub'); setShowOnboarding(true) }}
        onStartCleaningOnboarding={() => { resetOnboarding('cleaning'); setRepeatCleaning(null); setView('cleaning') }}
        onStartHandymanOnboarding={() => { resetOnboarding('handyman'); setRepeatHandyman(null); setView('handyman') }}
      />
    )
  }

  const activeEntries: ActiveOrderEntry[] = [
    ...(activeOrders !== 'loading' ? activeOrders.map(o => ({ type: 'cleaning' as const, order: o })) : []),
    ...(activeChistomatyOrder ? [{ type: 'chistomaty' as const, order: activeChistomatyOrder }] : []),
    ...activeHandymanOrders.map(o => ({ type: 'handyman' as const, order: o })),
  ]

  type HistoryEntry =
    | { type: 'cleaning'; order: Order; ts: number }
    | { type: 'handyman'; order: HandymanOrder; ts: number }

  const historyEntries: HistoryEntry[] = [
    ...historyOrders.map(o => ({ type: 'cleaning' as const, order: o, ts: Date.parse(o.created_at || o.order_date) || 0 })),
    ...historyHandymanOrders.map(o => ({ type: 'handyman' as const, order: o, ts: Date.parse(o.created_at || o.order_date) || 0 })),
  ].sort((a, b) => b.ts - a.ts)

  function renderBanner(entry: ActiveOrderEntry, onClick: (v: View) => void) {
    switch (entry.type) {
      case 'cleaning':   return <ActiveOrderBanner    key={entry.order.id} order={entry.order} onClick={() => { setDetailFromHistory(false); setFocusedOrder(entry.order); onClick('active_order') }} />
      case 'chistomaty': return <ChistomatyOrderBanner key={entry.order.id} order={entry.order} onClick={() => onClick('active_chistomaty')} />
      case 'handyman':   return <HandymanOrderBanner   key={entry.order.id} order={entry.order} onClick={() => { setDetailFromHistory(false); setFocusedHandymanOrder(entry.order); onClick('active_handyman') }} />
    }
  }

  return (
    <div class="min-h-screen bg-white flex flex-col">

      {/* Header */}
      <div class="px-5 pt-12 pb-5 flex items-center justify-between">
        <button
          ref={menuBtnRef}
          type="button"
          onClick={() => setView('menu')}
          class="w-9 h-9 rounded-full bg-gray-100 flex flex-col items-center justify-center gap-1 active:bg-gray-200 transition-colors"
        >
          <span class="w-4 h-0.5 bg-gray-600 rounded-full" />
          <span class="w-4 h-0.5 bg-gray-600 rounded-full" />
          <span class="w-4 h-0.5 bg-gray-600 rounded-full" />
        </button>
        <Logo class="h-7" />
        <div class="w-9 h-9" />
      </div>

      {/* Active order banners */}
      {activeEntries.length > 2
        ? <CombinedOrdersBanner count={activeEntries.length} onClick={() => setShowActiveSheet(true)} />
        : activeEntries.map(e => renderBanner(e, setView))
      }

      {/* Service tiles — boxes и лейблы разделены чтобы высоты совпадали */}
      <div class="px-4 pb-6">
        <div class="flex gap-3">
          <button
            ref={cleaningTileRef}
            type="button"
            onClick={() => { setRepeatCleaning(null); addresses.length === 0 ? setAddressGateFor('cleaning') : setView('cleaning') }}
            class="flex-1 relative aspect-square bg-white rounded-3xl border border-gray-100 shadow-sm p-2 flex items-center justify-center active:scale-[0.97] transition-transform"
          >
            <img src="/service_tiles/cleaning.png" alt={t('onboarding_cleaning_title')} class="w-full h-full object-contain" />
            <p class="absolute bottom-0 left-0 right-0 text-sm font-semibold text-gray-900 text-center">{t('onboarding_cleaning_title')}</p>
          </button>

          <button
            ref={handymanTileRef}
            type="button"
            onClick={() => { setRepeatHandyman(null); addresses.length === 0 ? setAddressGateFor('handyman') : setView('handyman') }}
            class="flex-1 relative aspect-square bg-white rounded-3xl border border-gray-100 shadow-sm p-2 flex items-center justify-center active:scale-[0.97] transition-transform"
          >
            <img src="/service_tiles/handyman.png" alt={t('onboarding_handyman_title')} class="w-full h-full object-contain" />
            <p class="absolute bottom-0 left-0 right-0 text-sm font-semibold text-gray-900 text-center">{t('onboarding_handyman_title')}</p>
          </button>

          {/* Временно скрыто по просьбе заказчика
          <button
            type="button"
            onClick={() => setView('chistomaty')}
            class="flex-1 relative aspect-square bg-white rounded-3xl border border-gray-100 shadow-sm p-2 flex items-center justify-center active:scale-[0.97] transition-transform"
          >
            <img src="/service_tiles/chistomaty.png" alt="Чистоматы" class="w-full h-full object-contain" />
            <p class="absolute bottom-0 left-0 right-0 text-sm font-semibold text-gray-900 text-center">Чистоматы</p>
          </button>
          */}
        </div>
      </div>

      {/* Order history */}
      <div class="px-4 mt-6 pb-8 flex flex-col gap-2">
        <p class="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-1">
          {t('history_orders_title')}
        </p>
        {historyEntries.length > 0 ? (
          historyEntries.map(e => (
            e.type === 'cleaning'
              ? <OrderHistoryItem
                  key={e.order.id}
                  order={e.order}
                  onClick={() => { setFocusedOrder(e.order); setDetailFromHistory(true); setView('active_order') }}
                />
              : <HandymanHistoryItem
                  key={e.order.id}
                  order={e.order}
                  onClick={() => { setFocusedHandymanOrder(e.order); setDetailFromHistory(true); setView('active_handyman') }}
                />
          ))
        ) : (
          <div class="bg-gray-50 rounded-2xl px-4 py-6 flex flex-col items-center gap-2">
            <p class="text-sm font-semibold text-gray-700">{t('history_empty_hint_title')}</p>
            <p class="text-xs text-gray-400 text-center">{t('history_empty_hint_sub')}</p>
          </div>
        )}
      </div>

      <BottomSheet open={showActiveSheet} onClose={() => setShowActiveSheet(false)}>
        <div class="px-0 pt-2 pb-6">
          <p class="text-base font-bold text-gray-900 px-5 mb-4">{t('active_orders_title')}</p>
          {activeEntries.map(e => renderBanner(e, v => { setShowActiveSheet(false); setView(v) }))}
        </div>
      </BottomSheet>

      {showOnboarding && (
        <OnboardingOverlay
          steps={[
            { ref: menuBtnRef, title: t('onboarding_menu_title'), description: t('onboarding_menu_desc') },
            { ref: cleaningTileRef, title: t('onboarding_cleaning_title'), description: t('onboarding_cleaning_desc') },
            { ref: handymanTileRef, title: t('onboarding_handyman_title'), description: t('onboarding_handyman_desc') },
          ]}
          skipLabel={t('onboarding_skip')}
          nextLabel={t('onboarding_next')}
          doneLabel={t('onboarding_done')}
          onFinish={finishOnboarding}
        />
      )}
    </div>
  )
}
