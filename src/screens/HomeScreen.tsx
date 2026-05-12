import { useEffect, useRef, useState } from 'preact/hooks'
import type { User } from '../types'
import type { Address, AddressPayload } from '../api/addresses'
import { createAddress, deleteAddress, updateAddress } from '../api/addresses'
import type { Order } from '../api/orders'
import { acceptOrder, cancelOrder, getUserOrders, rateOrder } from '../api/orders'
import { useAddresses } from '../hooks/useAddresses'
import { useLocale } from '../i18n'
import type { Lang, Strings } from '../i18n/locales'
import { getTheme, setTheme } from '../hooks/useTheme'
import { useExitBack } from '../hooks/useExitBack'
import { AddressFormScreen } from './AddressFormScreen'
import { ExecutorScreen } from './ExecutorScreen'
import { OrderScreen } from './OrderScreen'
import { ChatScreen } from './ChatScreen'
import { BottomBar } from '../components/BottomBar'
import type { Tab } from '../components/BottomBar'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { useConfirm } from '../hooks/useConfirm'

type View =
  | { name: 'list' }
  | { name: 'form'; address?: Address }
  | { name: 'new_order' }
  | { name: 'executor'; executorId: string }
  | { name: 'order_detail'; order: Order }
  | { name: 'chat'; orderId: string; executorId: string | null; executorName: string; senderId: string; readonly: boolean }

interface Props {
  user: User
}

export function HomeScreen({ user }: Props) {
  const [tab, setTab] = useState<Tab>('orders')
  const [view, setView] = useState<View>({ name: 'list' })
  const { state, reload } = useAddresses(user.telegram_id)
  const { t } = useLocale()
  const { confirm, dialogProps } = useConfirm()

  async function handleCreate(data: AddressPayload) {
    await createAddress(user.telegram_id, data)
    reload()
  }

  async function handleUpdate(address: Address, data: AddressPayload) {
    await updateAddress(user.telegram_id, address.id, data)
    reload()
  }

  async function handleDelete(address: Address) {
    const ok = await confirm(t('home_delete_confirm', { address: address.address }), { confirmVariant: 'danger' })
    if (!ok) return
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

  if (view.name === 'executor') {
    return <ExecutorScreen executorId={view.executorId} onBack={() => setView({ name: 'list' })} />
  }

  if (view.name === 'order_detail') {
    return (
      <OrderDetailScreen
        order={view.order}
        onBack={() => setView({ name: 'list' })}
        onChatClick={(orderId, executorId, executorName) =>
          setView({ name: 'chat', orderId, executorId, executorName, senderId: String(user.telegram_id), readonly: true })
        }
      />
    )
  }

  if (view.name === 'chat') {
    return (
      <ChatScreen
        orderId={view.orderId}
        executorId={view.executorId}
        executorName={view.executorName}
        senderId={view.senderId}
        readonly={view.readonly}
        onBack={() => setView({ name: 'list' })}
      />
    )
  }

  return (
    <div class="h-screen bg-gray-50 flex flex-col">
      <ConfirmDialog
        {...dialogProps}
        confirmLabel={t('dialog_ok')}
        cancelLabel={t('dialog_cancel')}
      />
      <div class="flex-1 overflow-y-auto flex flex-col">
        {tab === 'addresses' && (
          <AddressesTab
            state={state}
            onAdd={() => setView({ name: 'form' })}
            onEdit={addr => setView({ name: 'form', address: addr })}
            onDelete={handleDelete}
          />
        )}
        {tab === 'orders' && (
          <OrdersTab
            telegramId={user.telegram_id}
            onNewOrder={() => setView({ name: 'new_order' })}
            onExecutorClick={id => setView({ name: 'executor', executorId: id })}
            onChatClick={(orderId, executorId, executorName) =>
              setView({ name: 'chat', orderId, executorId, executorName, senderId: String(user.telegram_id), readonly: false })
            }
          />
        )}
        {tab === 'history' && (
          <HistoryTab
            telegramId={user.telegram_id}
            onOrderClick={order => setView({ name: 'order_detail', order })}
          />
        )}
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

const LOCALE_MAP: Record<Lang, string> = { ru: 'ru-RU', uz: 'uz-UZ', en: 'en-US' }

type TFn = (key: keyof Strings, params?: Record<string, string>) => string

function timeAgo(isoStr: string, t: TFn): string {
  const diff = Math.floor((Date.now() - new Date(isoStr).getTime()) / 1000)
  if (diff < 60) return t('time_ago_sec', { n: String(diff) })
  if (diff < 3600) return t('time_ago_min', { n: String(Math.floor(diff / 60)) })
  if (diff < 86400) return t('time_ago_hour', { n: String(Math.floor(diff / 3600)) })
  return t('time_ago_day', { n: String(Math.floor(diff / 86400)) })
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

const CHAT_STATUSES = new Set(['assigned', 'on_the_way', 'arrived', 'in_progress', 'awaiting_confirmation'])

function OrdersTab({ telegramId, onNewOrder, onExecutorClick, onChatClick }: { telegramId: number; onNewOrder: () => void; onExecutorClick: (id: string) => void; onChatClick: (orderId: string, executorId: string | null, executorName: string) => void }) {
  const { t, lang } = useLocale()
  const [activeOrder, setActiveOrder] = useState<Order | null | 'loading'>('loading')
  const [ratingOrderId, setRatingOrderId] = useState<string | null>(null)
  const [showRatingToast, setShowRatingToast] = useState(false)
  const [pendingCancel, setPendingCancel] = useState<Order | null>(null)
  const [countdown, setCountdown] = useState(10)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const { confirm, dialogProps } = useConfirm()

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  function startPolling() {
    if (pollRef.current) return
    pollRef.current = setInterval(async () => {
      try {
        const res = await getUserOrders(telegramId)
        const active = res.items.find(o => ACTIVE_STATUSES.has(o.status)) ?? null
        setActiveOrder(prev => {
          if (prev === 'loading') return active
          if (!active) {
            stopPolling()
            return active
          }
          return active
        })
      } catch {
        // keep previous state on network error
      }
    }, 12000)
  }

  function stopPolling() {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }

  useEffect(() => {
    getUserOrders(telegramId)
      .then(res => {
        const active = res.items.find(o => ACTIVE_STATUSES.has(o.status)) ?? null
        setActiveOrder(active)
        if (active) startPolling()
      })
      .catch(() => setActiveOrder(null))
    return stopPolling
  }, [telegramId])

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (intervalRef.current) clearInterval(intervalRef.current)
  }, [])

  async function handleAccept(order: Order) {
    const ok = await confirm(t('confirm_accept_work'), {
      title: t('confirm_accept_work_title'),
      confirmVariant: 'primary',
    })
    if (!ok) return
    await acceptOrder(order.id).catch(() => {})
    stopPolling()
    setRatingOrderId(order.id)
    setActiveOrder(null)
  }

  async function handleRatingDone(orderId: string, score: number, comment: string) {
    if (score > 0) {
      await rateOrder(orderId, score, comment || undefined).catch(() => {})
      setShowRatingToast(true)
      setTimeout(() => setShowRatingToast(false), 3000)
    }
    setRatingOrderId(null)
  }

  async function handleCancel(order: Order) {
    if (order.status === 'assigned') {
      const ok = await confirm(t('confirm_cancel_order'), {
        title: t('confirm_cancel_order_title'),
        confirmVariant: 'danger',
      })
      if (!ok) return
    }
    stopPolling()
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
    if (pendingCancel) startPolling()
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
        <ConfirmDialog
          {...dialogProps}
          confirmLabel={t('dialog_ok')}
          cancelLabel={t('dialog_cancel')}
        />
        <div class="flex-1 flex flex-col">
          <div class="flex-1 flex flex-col items-center justify-center gap-4 text-center">
            <img src="/cleaning-placeholder.webp" alt="" class="w-full max-w-[1000px] object-contain" />
            <p class="text-gray-400 text-sm">{t('home_no_orders')}</p>
          </div>
          <div class="px-6 pb-6">
            <button
              type="button"
              onClick={onNewOrder}
              class="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-3.5 rounded-xl transition-colors text-sm"
            >
              {t('home_order_now')}
            </button>
          </div>
        </div>
        {pendingCancel && <CancelToast countdown={countdown} onUndo={handleUndo} />}
        {showRatingToast && <TopToast message={t('rating_thanks')} />}
        {ratingOrderId && (
          <RatingSheet
            orderId={ratingOrderId}
            onDone={(score, comment) => handleRatingDone(ratingOrderId, score, comment)}
          />
        )}
      </>
    )
  }

  const statusIdx = STATUS_TIMELINE.indexOf(activeOrder.status)

  return (
    <div class="flex-1 flex flex-col">
      <ConfirmDialog
        {...dialogProps}
        confirmLabel={t('dialog_ok')}
        cancelLabel={t('dialog_cancel')}
      />
      <div class="flex-1 px-4 py-5 flex flex-col gap-4">
      {/* Status hero */}
      <div class="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div class="bg-blue-600 px-5 pt-6 pb-5">
          <div class="flex items-center justify-between mb-1">
            <p class="text-blue-200 text-xs font-medium">
              {t('history_order', { num: String(activeOrder.order_num) })}
            </p>
            <p class="text-blue-300 text-xs">{timeAgo(activeOrder.created_at, t)}</p>
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
              {activeOrder.executor_name && activeOrder.executor_id && (
                <button
                  type="button"
                  onClick={() => onExecutorClick(activeOrder.executor_id!)}
                  class="text-blue-100 text-xs mt-1 font-medium underline underline-offset-2 text-left"
                >
                  👤 {activeOrder.executor_name} →
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Progress timeline */}
        <div class="px-5 py-4">
          <div class="relative flex items-center justify-between">
            <div class="absolute inset-x-0 top-1/2 -translate-y-1/2 h-0.5 bg-gray-200" />
            <div
              class="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 bg-blue-400"
              style={`width:${statusIdx / (STATUS_TIMELINE.length - 1) * 100}%`}
            />
            {STATUS_TIMELINE.map((s, i) => {
              const done = i < statusIdx
              const current = i === statusIdx
              return (
                <div
                  key={s}
                  class={`relative z-10 w-2.5 h-2.5 rounded-full shrink-0 ${
                    current ? 'bg-blue-600 ring-4 ring-blue-100' :
                    done ? 'bg-blue-400' : 'bg-gray-200'
                  }`}
                />
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
              {new Date(activeOrder.order_date).toLocaleDateString(LOCALE_MAP[lang], { day: 'numeric', month: 'long' })}
              {activeOrder.order_slot ? `, ${activeOrder.order_slot}` : ''}
            </p>
          </div>
          <div class="flex items-center justify-between px-5 py-3">
            <div class="flex items-center gap-3">
              <span class="text-base leading-none">💰</span>
              <p class="text-sm text-gray-700">{t('confirm_total')}</p>
            </div>
            <p class="text-sm font-semibold text-gray-900">{activeOrder.price.toLocaleString()} {t('currency')}</p>
          </div>
        </div>

        {CHAT_STATUSES.has(activeOrder.status) && activeOrder.executor_id && activeOrder.executor_name && (
          <button
            type="button"
            onClick={() => onChatClick(activeOrder.id, activeOrder.executor_id ?? null, activeOrder.executor_name!)}
            class="w-full border-t border-gray-100 py-3.5 text-sm font-medium text-blue-600 flex items-center justify-center gap-2 hover:bg-blue-50 active:bg-blue-100 transition-colors"
          >
            💬 {t('chat_contact_cleaner')}
          </button>
        )}

        {activeOrder.status === 'awaiting_confirmation' && (
          <button
            type="button"
            onClick={() => handleAccept(activeOrder)}
            class="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-4 transition-all active:scale-95 text-sm"
          >
            {t('home_accept_work')}
          </button>
        )}
      </div>
      </div>

      <div class="px-4 pb-6 flex flex-col gap-3">

        <button
          type="button"
          onClick={onNewOrder}
          class="w-full border-2 border-blue-600 text-blue-600 font-medium py-3.5 rounded-xl transition-all active:scale-95 text-sm hover:bg-blue-50"
        >
          {t('home_order_now')}
        </button>

        {!['in_progress', 'awaiting_confirmation'].includes(activeOrder.status) && (
          <button
            type="button"
            onClick={() => handleCancel(activeOrder)}
            class="w-full border-2 border-red-400 text-red-500 font-medium py-3.5 rounded-xl transition-all active:scale-95 text-sm hover:bg-red-50"
          >
            {t('home_cancel_order')}
          </button>
        )}
      </div>
    </div>
  )
}

function TopToast({ message }: { message: string }) {
  return (
    <div class="fixed top-4 left-4 right-4 z-50 flex justify-center pointer-events-none animate-toast-top-in">
      <div class="bg-gray-900 text-white text-sm font-medium px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2">
        <span>✅</span>
        <span>{message}</span>
      </div>
    </div>
  )
}

function CancelToast({ countdown, onUndo }: { countdown: number; onUndo: () => void }) {
  return (
    <div class="fixed bottom-20 left-4 right-4 z-50 bg-gray-900 text-white rounded-2xl px-4 py-3 shadow-xl flex flex-col gap-2 animate-toast-in">
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

function RatingSheet({ orderId: _orderId, onDone }: { orderId: string; onDone: (score: number, comment: string) => void }) {
  const { t } = useLocale()
  const [score, setScore] = useState(0)
  const [hovered, setHovered] = useState(0)
  const [comment, setComment] = useState('')

  return (
    <div class="fixed inset-0 z-50 flex items-end">
      <div class="absolute inset-0 bg-black/40 animate-fade-in" />
      <div class="relative w-full bg-white rounded-t-3xl px-6 pt-6 pb-10 flex flex-col gap-5 animate-slide-up">
        <div class="w-10 h-1 bg-gray-200 rounded-full mx-auto" />
        <div class="text-center">
          <p class="text-lg font-semibold text-gray-900">{t('rating_title')}</p>
          <p class="text-sm text-gray-400 mt-1">{t('rating_subtitle')}</p>
        </div>
        <div class="flex justify-center gap-3">
          {[1, 2, 3, 4, 5].map(n => {
            const active = n <= (hovered || score)
            const justSelected = n === score
            return (
              <button
                key={justSelected ? `sel-${n}` : n}
                type="button"
                onClick={() => setScore(n)}
                onMouseEnter={() => setHovered(n)}
                onMouseLeave={() => setHovered(0)}
                class={`text-4xl leading-none transition-colors active:scale-90 ${justSelected ? 'animate-star-pop' : ''}`}
                style={{ color: active ? '#f59e0b' : '#d1d5db' }}
              >
                ★
              </button>
            )
          })}
        </div>
        <textarea
          class="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 resize-none outline-none focus:border-blue-400 transition-colors bg-gray-50"
          rows={3}
          placeholder={t('rating_comment_placeholder')}
          value={comment}
          onInput={e => setComment((e.target as HTMLTextAreaElement).value)}
        />
        <button
          type="button"
          disabled={score === 0}
          onClick={() => onDone(score, comment)}
          class="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-semibold py-3.5 rounded-xl transition-all active:scale-95 text-sm"
        >
          {t('rating_submit')}
        </button>
        <button
          type="button"
          onClick={() => onDone(0, '')}
          class="text-sm text-gray-400 hover:text-gray-600 active:scale-95 transition-all text-center -mt-2"
        >
          {t('rating_skip')}
        </button>
      </div>
    </div>
  )
}

function OrderDetailScreen({ order, onBack, onChatClick }: { order: Order; onBack: () => void; onChatClick: (orderId: string, executorId: string | null, executorName: string) => void }) {
  const { t, lang } = useLocale()
  const { exiting, handleBack } = useExitBack(onBack)

  const addonNames = order.addons
    .map(id => t(`addon_${id}` as keyof Strings) || id)
    .filter(Boolean)

  const createdAt = new Date(order.created_at)
  const createdLabel = createdAt.toLocaleString(LOCALE_MAP[lang], {
    day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
  })

  return (
    <div class={`h-screen bg-gray-50 flex flex-col ${exiting ? 'animate-slide-out-right' : 'animate-slide-in-right'}`}>
      {/* Header */}
      <div class="bg-white border-b border-gray-100 px-4 pt-4 pb-3 flex items-center gap-3 shrink-0">
        <button
          type="button"
          onClick={handleBack}
          class="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 active:bg-gray-200 transition-colors text-gray-700 text-xl"
        >
          ‹
        </button>
        <div class="flex-1 min-w-0">
          <p class="text-base font-semibold text-gray-900">
            {t('history_order', { num: String(order.order_num) })}
          </p>
          <p class="text-xs text-gray-400">{createdLabel}</p>
        </div>
        <span class={`text-[11px] font-medium px-2.5 py-1 rounded-full shrink-0 ${statusColor(order.status)}`}>
          {t(statusKey(order.status)) || order.status}
        </span>
      </div>

      <div class="flex-1 overflow-y-auto px-4 py-5 flex flex-col gap-3">
        {/* Service summary */}
        <div class="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
          <DetailRow icon="🧹" label={t('confirm_service')} value={t(`svc_${order.service_type}`) || order.service_type} />
          <DetailRow icon="📍" label={t('confirm_address')} value={order.address} />
          <DetailRow
            icon="📅"
            label={t('confirm_date')}
            value={`${formatOrderDate(order.order_date, lang)}${order.order_slot ? `, ${order.order_slot}` : ''}`}
          />
          <DetailRow
            icon="🏠"
            label={t('confirm_rooms')}
            value={`${t('history_rooms', { n: String(order.rooms) })} · ${t('history_bathrooms', { n: String(order.bathrooms) })}`}
          />
          <div class="flex items-center justify-between px-4 py-3">
            <div class="flex items-center gap-3">
              <span class="text-base leading-none">💰</span>
              <p class="text-sm text-gray-500">{t('confirm_total')}</p>
            </div>
            <p class="text-sm font-semibold text-gray-900">{order.price.toLocaleString()} {t('currency')}</p>
          </div>
        </div>

        {/* Executor / addons / comment */}
        {(order.executor_name || addonNames.length > 0 || order.comment) && (
          <div class="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
            {order.executor_name && (
              <DetailRow icon="👤" label={t('history_executor')} value={order.executor_name} />
            )}
            {addonNames.length > 0 && (
              <DetailRow icon="✨" label={t('confirm_addons')} value={addonNames.join(', ')} />
            )}
            {order.comment && (
              <DetailRow icon="💬" label={t('history_comment_label')} value={order.comment} />
            )}
          </div>
        )}

        {/* Chat history */}
        {order.executor_name && (
          <button
            type="button"
            onClick={() => onChatClick(order.id, order.executor_id ?? null, order.executor_name!)}
            class="w-full bg-white rounded-2xl border border-gray-100 px-4 py-3.5 flex items-center gap-3 hover:bg-gray-50 active:bg-gray-100 transition-colors text-left"
          >
            <span class="text-xl leading-none">💬</span>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-gray-900">{t('chat_history_section')}</p>
              <p class="text-xs text-gray-400">{t('chat_history_hint')}</p>
            </div>
            <span class="text-gray-300 text-lg leading-none">›</span>
          </button>
        )}

        {/* Rating */}
        {order.rating && (
          <div class="bg-white rounded-2xl border border-gray-100 px-4 py-3">
            <p class="text-xs text-gray-400 mb-2">{t('history_rating_label')}</p>
            <div class="flex gap-1 mb-2">
              {[1,2,3,4,5].map(n => (
                <span key={n} style={{ color: n <= order.rating!.score ? '#f59e0b' : '#e5e7eb' }} class="text-2xl leading-none">★</span>
              ))}
            </div>
            {order.rating.comment && (
              <p class="text-sm text-gray-600 italic">"{order.rating.comment}"</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function DetailRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div class="flex items-start gap-3 px-4 py-3">
      <span class="text-base leading-none mt-0.5">{icon}</span>
      <div class="flex-1 min-w-0">
        <p class="text-xs text-gray-400 mb-0.5">{label}</p>
        <p class="text-sm text-gray-800 break-words">{value}</p>
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

function formatOrderDate(dateStr: string, lang: Lang): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString(LOCALE_MAP[lang], { day: 'numeric', month: 'short', year: 'numeric' })
}

function HistoryTab({ telegramId, onOrderClick }: { telegramId: number; onOrderClick: (o: Order) => void }) {
  const { t, lang } = useLocale()
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
        <button
          key={order.id}
          type="button"
          class="w-full text-left bg-white rounded-xl p-4 border border-gray-100 active:bg-gray-50 transition-colors"
          onClick={() => onOrderClick(order)}
        >
          <div class="flex items-start justify-between gap-2 mb-2">
            <p class="text-sm font-semibold text-gray-900">
              {t('history_order', { num: String(order.order_num) })}
            </p>
            <div class="flex items-center gap-1.5 shrink-0">
              <span class={`text-[11px] font-medium px-2 py-0.5 rounded-full ${statusColor(order.status)}`}>
                {t(statusKey(order.status)) || order.status}
              </span>
              <span class="text-gray-300 text-sm">›</span>
            </div>
          </div>

          <p class="text-xs text-gray-600 mb-1">
            {t(`svc_${order.service_type}`) || order.service_type}
            {' · '}
            {t('history_rooms', { n: String(order.rooms) })}
            {' · '}
            {t('history_bathrooms', { n: String(order.bathrooms) })}
          </p>

          <div class="flex items-center justify-between">
            <p class="text-xs text-gray-400">
              {formatOrderDate(order.order_date, lang)}{order.order_slot ? `, ${order.order_slot}` : ''}
            </p>
            <p class="text-sm font-semibold text-gray-900">
              {order.price.toLocaleString()} {t('currency')}
            </p>
          </div>
        </button>
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
