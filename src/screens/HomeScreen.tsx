import { useEffect, useRef, useState } from 'preact/hooks'
import type { Theme } from '../hooks/useTheme'
import type { User } from '../types'
import type { Address, AddressPayload } from '../api/addresses'
import { createAddress, deleteAddress, updateAddress } from '../api/addresses'
import type { Order } from '../api/orders'
import { cancelOrder, getUserOrders } from '../api/orders'
import { useAddresses } from '../hooks/useAddresses'
import { useLocale } from '../i18n'
import type { Lang } from '../i18n/locales'
import { getTheme, setTheme } from '../hooks/useTheme'
import { AddressFormScreen } from './AddressFormScreen'
import { OrderScreen } from './OrderScreen'
import { BottomBar } from '../components/BottomBar'
import type { Tab } from '../components/BottomBar'

type View =
  | { name: 'list' }
  | { name: 'form'; address?: Address }
  | { name: 'new_order' }

interface Props {
  user: User
}

export function HomeScreen({ user }: Props) {
  const [tab, setTab] = useState<Tab>('orders')
  const [view, setView] = useState<View>({ name: 'list' })
  const { state, reload } = useAddresses(user.telegram_id)
  const { t } = useLocale()

  async function handleCreate(data: AddressPayload) {
    await createAddress(user.telegram_id, data)
    reload()
  }

  async function handleUpdate(address: Address, data: AddressPayload) {
    await updateAddress(user.telegram_id, address.id, data)
    reload()
  }

  async function handleDelete(address: Address) {
    if (!confirm(t('home_delete_confirm', { address: address.address }))) return
    await deleteAddress(user.telegram_id, address.id)
    reload()
  }

  if (view.name === 'form') {
    const editing = view.address
    return (
      <AddressFormScreen
        initial={editing}
        onSubmit={data => editing ? handleUpdate(editing, data) : handleCreate(data)}
        onBack={() => setView({ name: 'list' })}
      />
    )
  }

  if (view.name === 'new_order') {
    return <OrderScreen user={user} onBack={() => setView({ name: 'list' })} />
  }

  return (
    <div class="min-h-screen bg-gray-50 flex flex-col">
      <div class="flex-1 overflow-y-auto">
        {tab === 'addresses' && (
          <AddressesTab
            state={state}
            onAdd={() => setView({ name: 'form' })}
            onEdit={addr => setView({ name: 'form', address: addr })}
            onDelete={handleDelete}
          />
        )}
        {tab === 'orders' && <OrdersTab telegramId={user.telegram_id} onNewOrder={() => setView({ name: 'new_order' })} />}
        {tab === 'history' && <HistoryTab telegramId={user.telegram_id} />}
        {tab === 'settings' && <SettingsTab user={user} />}
      </div>

      <BottomBar active={tab} onChange={t => { setTab(t); setView({ name: 'list' }) }} />
    </div>
  )
}

// ─── Tabs ────────────────────────────────────────────────────────────────────

interface AddressesTabProps {
  state: ReturnType<typeof useAddresses>['state']
  onAdd: () => void
  onEdit: (addr: Address) => void
  onDelete: (addr: Address) => void
}

function AddressesTab({ state, onAdd, onEdit, onDelete }: AddressesTabProps) {
  const { t } = useLocale()
  return (
    <div class="px-4 py-5 flex flex-col">
      <div class="flex items-center justify-between mb-3">
        <h2 class="text-sm font-medium text-gray-500">{t('home_saved_addresses')}</h2>
        <button type="button" onClick={onAdd} class="text-blue-600 text-sm font-medium">
          {t('home_add_address')}
        </button>
      </div>

      {state.status === 'loading' && (
        <p class="text-sm text-gray-400">{t('btn_loading')}</p>
      )}

      {state.status === 'error' && (
        <p class="text-sm text-red-500">{state.message}</p>
      )}

      {state.status === 'success' && state.data.length === 0 && (
        <div class="flex-1 flex flex-col items-center justify-center gap-2 text-center py-16">
          <p class="text-gray-400 text-sm">{t('home_no_addresses')}</p>
          <button type="button" onClick={onAdd} class="text-blue-600 text-sm font-medium">
            {t('home_add_first')}
          </button>
        </div>
      )}

      {state.status === 'success' && state.data.map(addr => (
        <div key={addr.id} class="bg-white rounded-xl p-4 mb-2 border border-gray-100">
          <div class="flex items-start justify-between gap-2">
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-gray-900 truncate">{addr.address}</p>
              {(addr.apartment || addr.floor || addr.entrance) && (
                <p class="text-xs text-gray-400 mt-0.5">
                  {[
                    addr.entrance && t('home_entrance', { n: addr.entrance }),
                    addr.floor && t('home_floor', { n: addr.floor }),
                    addr.apartment && t('home_apt', { n: addr.apartment }),
                  ].filter(Boolean).join(', ')}
                </p>
              )}
              {addr.intercom && (
                <p class="text-xs text-gray-400">{t('home_intercom', { n: addr.intercom })}</p>
              )}
              {(addr.rooms != null || addr.bathrooms != null || addr.housing_type) && (
                <p class="text-xs text-gray-400 mt-0.5">
                  {[
                    addr.housing_type && t(`housing_${addr.housing_type}`),
                    addr.rooms && `${addr.rooms} ${t('home_rooms_short')}`,
                    addr.bathrooms && `${addr.bathrooms} ${t('home_bathrooms_short')}`,
                  ].filter(Boolean).join(' · ')}
                </p>
              )}
            </div>
            <div class="flex gap-3 shrink-0">
              <button
                type="button"
                onClick={() => onEdit(addr)}
                class="text-xs text-blue-600 font-medium"
              >
                {t('btn_edit')}
              </button>
              <button
                type="button"
                onClick={() => onDelete(addr)}
                class="text-xs text-red-500 font-medium"
              >
                {t('btn_delete')}
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

const ACTIVE_STATUSES = new Set(['new', 'assigned', 'on_the_way', 'arrived', 'in_progress', 'awaiting_confirmation'])

const STATUS_TIMELINE = ['new', 'assigned', 'on_the_way', 'arrived', 'in_progress', 'awaiting_confirmation', 'completed']

function timeAgo(isoStr: string): string {
  const diff = Math.floor((Date.now() - new Date(isoStr).getTime()) / 1000)
  if (diff < 60) return `${diff} сек. назад`
  if (diff < 3600) return `${Math.floor(diff / 60)} мин. назад`
  if (diff < 86400) return `${Math.floor(diff / 3600)} ч. назад`
  return `${Math.floor(diff / 86400)} дн. назад`
}

const STATUS_ICON: Record<string, string> = {
  new: '🕐',
  assigned: '👤',
  on_the_way: '🚗',
  arrived: '🚪',
  in_progress: '🧹',
  awaiting_confirmation: '✅',
  completed: '🎉',
}

function OrdersTab({ telegramId, onNewOrder }: { telegramId: number; onNewOrder: () => void }) {
  const { t } = useLocale()
  const [activeOrder, setActiveOrder] = useState<Order | null | 'loading'>('loading')
  const [pendingCancel, setPendingCancel] = useState<Order | null>(null)
  const [countdown, setCountdown] = useState(10)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    getUserOrders(telegramId)
      .then(res => {
        const active = res.items.find(o => ACTIVE_STATUSES.has(o.status)) ?? null
        setActiveOrder(active)
      })
      .catch(() => setActiveOrder(null))
  }, [telegramId])

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (intervalRef.current) clearInterval(intervalRef.current)
  }, [])

  function handleCancel(order: Order) {
    setActiveOrder(null)
    setPendingCancel(order)
    setCountdown(10)

    intervalRef.current = setInterval(() => {
      setCountdown(c => c - 1)
    }, 1000)

    timerRef.current = setTimeout(async () => {
      clearInterval(intervalRef.current!)
      setPendingCancel(null)
      await cancelOrder(order.id).catch(() => {})
    }, 10000)
  }

  function handleUndo() {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (intervalRef.current) clearInterval(intervalRef.current)
    setActiveOrder(pendingCancel)
    setPendingCancel(null)
  }

  if (activeOrder === 'loading') {
    return (
      <div class="flex-1 flex items-center justify-center py-24">
        <p class="text-sm text-gray-400">{t('btn_loading')}</p>
      </div>
    )
  }

  if (!activeOrder) {
    return (
      <>
        <div class="flex-1 flex flex-col items-center justify-center gap-6 py-16 text-center">
          <img src="/cleaning-placeholder.webp" alt="" class="w-full max-w-[1000px] object-contain" />
          <div class="px-6 flex flex-col items-center gap-4 w-full">
            <p class="text-gray-400 text-sm">{t('home_no_orders')}</p>
            <button
              type="button"
              onClick={onNewOrder}
              class="w-full max-w-xs bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-3.5 rounded-xl transition-colors text-sm"
            >
              {t('home_order_now')}
            </button>
          </div>
        </div>
        {pendingCancel && <CancelToast countdown={countdown} onUndo={handleUndo} />}
      </>
    )
  }

  const statusIdx = STATUS_TIMELINE.indexOf(activeOrder.status)

  return (
    <div class="px-4 py-5 flex flex-col gap-4">
      {/* Status hero */}
      <div class="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div class="bg-blue-600 px-5 pt-6 pb-5">
          <div class="flex items-center justify-between mb-1">
            <p class="text-blue-200 text-xs font-medium">
              {t('history_order', { num: String(activeOrder.order_num) })}
            </p>
            <p class="text-blue-300 text-xs">{timeAgo(activeOrder.created_at)}</p>
          </div>
          <div class="flex items-center gap-3">
            <span class="text-4xl leading-none">{STATUS_ICON[activeOrder.status] ?? '🧹'}</span>
            <div>
              <p class="text-white text-lg font-semibold leading-tight">
                {t(statusKey(activeOrder.status)) || activeOrder.status}
              </p>
              <p class="text-blue-200 text-xs mt-0.5">
                {t(`svc_${activeOrder.service_type}`) || activeOrder.service_type}
              </p>
            </div>
          </div>
        </div>

        {/* Progress timeline */}
        <div class="px-5 py-4">
          <div class="flex items-center justify-between">
            {STATUS_TIMELINE.map((s, i) => {
              const done = i < statusIdx
              const current = i === statusIdx
              return (
                <div key={s} class="flex-1 flex items-center">
                  <div class={`w-2.5 h-2.5 rounded-full shrink-0 ${
                    current ? 'bg-blue-600 ring-4 ring-blue-100' :
                    done ? 'bg-blue-400' : 'bg-gray-200'
                  }`} />
                  {i < STATUS_TIMELINE.length - 1 && (
                    <div class={`flex-1 h-0.5 mx-0.5 ${i < statusIdx ? 'bg-blue-400' : 'bg-gray-200'}`} />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Order details */}
        <div class="border-t border-gray-100 divide-y divide-gray-50">
          <div class="flex items-start gap-3 px-5 py-3">
            <span class="text-base leading-none mt-0.5">📍</span>
            <p class="text-sm text-gray-700 flex-1">{activeOrder.address}</p>
          </div>
          <div class="flex items-center gap-3 px-5 py-3">
            <span class="text-base leading-none">📅</span>
            <p class="text-sm text-gray-700">
              {new Date(activeOrder.order_date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
              {activeOrder.order_slot ? `, ${activeOrder.order_slot}` : ''}
            </p>
          </div>
          <div class="flex items-center justify-between px-5 py-3">
            <div class="flex items-center gap-3">
              <span class="text-base leading-none">💰</span>
              <p class="text-sm text-gray-700">{t('confirm_total')}</p>
            </div>
            <p class="text-sm font-semibold text-gray-900">{activeOrder.price.toLocaleString()} сум</p>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={onNewOrder}
        class="w-full border-2 border-blue-600 text-blue-600 font-medium py-3.5 rounded-xl transition-colors text-sm hover:bg-blue-50"
      >
        {t('home_order_now')}
      </button>

      <button
        type="button"
        onClick={() => handleCancel(activeOrder)}
        class="w-full border-2 border-red-400 text-red-500 font-medium py-3.5 rounded-xl transition-colors text-sm hover:bg-red-50"
      >
        Отменить заказ
      </button>
    </div>
  )
}

function CancelToast({ countdown, onUndo }: { countdown: number; onUndo: () => void }) {
  return (
    <div class="fixed bottom-20 left-4 right-4 z-50 bg-gray-900 text-white rounded-2xl px-4 py-3 shadow-xl flex flex-col gap-2">
      <div class="flex items-center justify-between gap-3">
        <p class="text-sm">Заказ отменён. Вернуть?</p>
        <button
          type="button"
          onClick={onUndo}
          class="shrink-0 text-sm font-semibold text-blue-400 hover:text-blue-300"
        >
          Вернуть ({countdown})
        </button>
      </div>
      <div class="h-1 bg-gray-700 rounded-full overflow-hidden">
        <div
          class="h-full bg-blue-500 rounded-full transition-all duration-1000"
          style={`width:${countdown * 10}%`}
        />
      </div>
    </div>
  )
}

function statusKey(s: string): string {
  return `status_${s.replace(/-/g, '_')}` as string
}

function statusColor(s: string): string {
  if (s === 'completed') return 'bg-green-100 text-green-700'
  if (s === 'cancelled' || s === 'disputed') return 'bg-red-100 text-red-600'
  if (s === 'in_progress' || s === 'arrived') return 'bg-orange-100 text-orange-700'
  if (s === 'assigned' || s === 'on_the_way') return 'bg-blue-100 text-blue-700'
  return 'bg-gray-100 text-gray-600'
}

function formatOrderDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })
}

function HistoryTab({ telegramId }: { telegramId: number }) {
  const { t } = useLocale()
  const [orders, setOrders] = useState<Order[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getUserOrders(telegramId)
      .then(res => setOrders(res.items))
      .catch(err => setError(err?.message ?? 'Error'))
  }, [telegramId])

  if (error) {
    return (
      <div class="flex-1 flex items-center justify-center py-24 px-4">
        <p class="text-sm text-red-500 text-center">{error}</p>
      </div>
    )
  }

  if (orders === null) {
    return (
      <div class="flex-1 flex items-center justify-center py-24">
        <p class="text-sm text-gray-400">{t('history_loading')}</p>
      </div>
    )
  }

  if (orders.length === 0) {
    return (
      <div class="flex-1 flex items-center justify-center py-24 px-4">
        <p class="text-sm text-gray-400 text-center">{t('history_empty')}</p>
      </div>
    )
  }

  return (
    <div class="px-4 py-5 flex flex-col gap-2">
      <h2 class="text-sm font-medium text-gray-500 mb-1">{t('tab_history')}</h2>
      {orders.map(order => (
        <div key={order.id} class="bg-white rounded-xl p-4 border border-gray-100">
          <div class="flex items-start justify-between gap-2 mb-2">
            <p class="text-sm font-semibold text-gray-900">
              {t('history_order', { num: String(order.order_num) })}
            </p>
            <span class={`text-[11px] font-medium px-2 py-0.5 rounded-full shrink-0 ${statusColor(order.status)}`}>
              {t(statusKey(order.status)) || order.status}
            </span>
          </div>

          <p class="text-xs text-gray-700 mb-1">
            {t(`svc_${order.service_type}`) || order.service_type}
            {' · '}
            {t('history_rooms', { n: String(order.rooms) })}
            {' · '}
            {t('history_bathrooms', { n: String(order.bathrooms) })}
          </p>

          <p class="text-xs text-gray-500 truncate mb-1">{order.address}</p>

          <div class="flex items-center justify-between">
            <p class="text-xs text-gray-400">
              {formatOrderDate(order.order_date)}{order.order_slot ? `, ${order.order_slot}` : ''}
            </p>
            <p class="text-sm font-semibold text-gray-900">
              {order.price.toLocaleString()} сум
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}

const LANGS: { id: Lang; flag: string }[] = [
  { id: 'ru', flag: '🇷🇺' },
  { id: 'uz', flag: '🇺🇿' },
  { id: 'en', flag: '🇬🇧' },
]

function SettingsTab({ user }: { user: User }) {
  const { t, lang, setLang } = useLocale()
  const [theme, setThemeState] = useState(getTheme())

  function toggleTheme() {
    const next = theme === 'light' ? 'dark' : 'light'
    setTheme(next)
    setThemeState(next)
  }

  return (
    <div class="px-4 py-5 flex flex-col gap-4">
      <div class="bg-white rounded-xl p-4 border border-gray-100">
        <p class="text-sm font-medium text-gray-900">{user.first_name} {user.last_name}</p>
        {user.phone && <p class="text-xs text-gray-400 mt-0.5">{user.phone}</p>}
      </div>

      <div class="bg-white rounded-xl p-4 border border-gray-100">
        <p class="text-xs font-medium text-gray-500 mb-3">{t('settings_language')}</p>
        <div class="flex gap-2">
          {LANGS.map(({ id, flag }) => (
            <button
              key={id}
              type="button"
              onClick={() => setLang(id)}
              class={`flex-1 flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 transition-colors ${
                lang === id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 bg-gray-50'
              }`}
            >
              <span class="text-2xl leading-none">{flag}</span>
              <span class={`text-xs font-medium ${lang === id ? 'text-blue-700' : 'text-gray-500'}`}>
                {t(`lang_${id}`)}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div class="bg-white rounded-xl p-4 border border-gray-100">
        <div class="flex items-center justify-between">
          <span class="text-sm font-medium text-gray-900">
            {theme === 'dark' ? '🌙' : '☀️'} {theme === 'dark' ? 'Тёмная тема' : 'Светлая тема'}
          </span>
          <button
            type="button"
            onClick={toggleTheme}
            style={`width:48px;height:28px;border-radius:14px;position:relative;transition:background 0.2s;background:${theme === 'dark' ? '#0a84ff' : '#d1d5db'}`}
          >
            <span style={`position:absolute;top:3px;width:22px;height:22px;border-radius:50%;background:white;box-shadow:0 1px 3px rgba(0,0,0,.3);transition:left 0.2s;left:${theme === 'dark' ? '23px' : '3px'}`} />
          </button>
        </div>
      </div>
    </div>
  )
}
