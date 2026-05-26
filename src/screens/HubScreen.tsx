import { useEffect, useRef, useState } from 'preact/hooks'
import { Home, Sparkles, User as UserIcon, Sun, Moon, MessageCircle, ChevronRight, Shirt } from 'lucide-react'
import type { User } from '../types'
import type { Order } from '../api/orders'
import { getUserOrders } from '../api/orders'
import { useAddresses } from '../hooks/useAddresses'
import { useLocale } from '../i18n'
import type { Lang } from '../i18n/locales'
import { getTheme, setTheme } from '../hooks/useTheme'
import { updateLanguage } from '../api/clients'
import { OrderScreen } from './OrderScreen'
import { ChistomatyScreen } from './ChistomatyScreen'
import { ActiveOrderScreen } from './ActiveOrderScreen'
import { HouseOrderStatusScreen } from './HouseOrderStatusScreen'
import { ChatScreen } from './ChatScreen'
import { ActiveChistomatyScreen } from './ActiveChistomatyScreen'
import type { ChistomatyOrder } from './ActiveChistomatyScreen'
import { CHISTOMATY_STATUS_LABEL } from './ActiveChistomatyScreen'

const ACTIVE_STATUSES = new Set([
  'new', 'assigned', 'on_the_way', 'arrived', 'in_progress', 'awaiting_confirmation',
  'assessment', 'price_submitted', 'price_rejected', 'team_formation',
])

const HISTORY_STATUSES = new Set(['completed', 'cancelled'])

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  completed: { bg: '#F0F9EE', text: '#44973A' },
  cancelled:  { bg: '#FEF2F2', text: '#EF4444' },
}

const STATUS_HISTORY_LABEL: Record<string, string> = {
  completed: 'Завершён',
  cancelled:  'Отменён',
}

function formatOrderDate(dateStr: string): string {
  return new Intl.DateTimeFormat('ru', {
    day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
    timeZone: 'Asia/Tashkent',
  }).format(new Date(dateStr))
}

function formatPrice(price: number): string {
  return price.toLocaleString('ru') + ' сум'
}

const STATUS_LABEL: Record<string, string> = {
  new:                   'Ищем клинера...',
  assigned:              'Клинер назначен',
  on_the_way:            'Клинер едет к вам',
  arrived:               'Клинер прибыл',
  in_progress:           'Идёт уборка',
  awaiting_confirmation: 'Примите работу',
  assessment:            'Бригадир едет',
  price_submitted:       'Бригадир оценил работу',
  price_rejected:        'Ожидаем новую цену',
  team_formation:        'Команда формируется',
}

// ─── Service Tile ─────────────────────────────────────────────────────────────

function ServiceTile({
  label,
  image,
  soon = false,
  stretch = false,
  onClick,
}: {
  label: string
  image: string
  soon?: boolean
  stretch?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      class={`flex flex-col gap-2 w-full text-left active:scale-[0.97] transition-transform ${stretch ? 'flex-1' : ''}`}
    >
      <div class={`relative bg-white rounded-3xl border border-gray-100 shadow-sm w-full flex items-center justify-center p-2 ${stretch ? 'flex-1' : 'aspect-square'}`}>
        {soon && (
          <span class="absolute top-2.5 right-2.5 z-10 bg-gray-100 text-gray-500 text-[9px] font-semibold px-2 py-0.5 rounded-full">
            Скоро
          </span>
        )}
        <img src={image} alt={label} class="w-full h-full object-contain" />
      </div>
      <p class="text-sm font-semibold text-gray-900 text-center">{label}</p>
    </button>
  )
}

// ─── Address Chip ─────────────────────────────────────────────────────────────

function AddressChip({ address, onClick }: { address: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      class="w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-gray-100 active:bg-gray-200 transition-colors text-left"
    >
      <Home size={18} class="text-gray-500 shrink-0" />
      <p class="text-sm font-medium text-gray-700 truncate">{address}</p>
    </button>
  )
}

// ─── Active Order Banner ──────────────────────────────────────────────────────

function ActiveOrderBanner({ order, onClick }: { order: Order; onClick: () => void }) {
  const label = STATUS_LABEL[order.status] ?? 'Активный заказ'
  return (
    <button
      type="button"
      onClick={onClick}
      class="mx-4 mb-4 w-[calc(100%-32px)] bg-[#44973A] rounded-2xl px-4 py-3.5 flex items-center gap-3 active:opacity-90 transition-opacity text-left"
    >
      <div class="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
        <Sparkles size={20} class="text-white" />
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
  const label = CHISTOMATY_STATUS_LABEL[order.status]
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
        <p class="text-white/60 text-[10px] font-medium mb-0.5">Чистоматы</p>
        <p class="text-white font-bold text-sm leading-tight">{label}</p>
        <p class="text-white/70 text-xs truncate mt-0.5">{order.postamat_address}</p>
      </div>
      <span class="text-white/60 text-xl leading-none shrink-0">›</span>
    </button>
  )
}

// ─── Order History Item ───────────────────────────────────────────────────────

function OrderHistoryItem({ order }: { order: Order }) {
  const c = STATUS_COLORS[order.status] ?? { bg: '#F3F4F6', text: '#6B7280' }
  const label = STATUS_HISTORY_LABEL[order.status] ?? order.status
  return (
    <div class="bg-white rounded-2xl border border-gray-100 px-4 py-3.5 flex items-center gap-3">
      <div
        class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: c.bg }}
      >
        <Sparkles size={18} style={{ color: c.text }} />
      </div>
      <div class="flex-1 min-w-0">
        <div class="flex items-center justify-between gap-2">
          <p class="text-sm font-semibold text-gray-900">Клининг</p>
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
          <p class="text-sm font-semibold text-gray-900">{formatPrice(order.price)}</p>
        </div>
      </div>
    </div>
  )
}

// ─── Coming Soon Toast ────────────────────────────────────────────────────────

function ComingSoonToast({ message }: { message: string }) {
  return (
    <div class="fixed bottom-8 left-4 right-4 z-50 flex justify-center pointer-events-none animate-toast-in">
      <div class="bg-gray-900 text-white text-sm font-medium px-5 py-3 rounded-2xl shadow-xl">
        {message}
      </div>
    </div>
  )
}

// ─── Menu Screen ─────────────────────────────────────────────────────────────

const LANGS: { id: Lang; flag: string; label: string }[] = [
  { id: 'ru', flag: '🇷🇺', label: 'Русский' },
  { id: 'uz', flag: '🇺🇿', label: "O'zbek" },
  { id: 'en', flag: '🇬🇧', label: 'English' },
]

function MenuScreen({ user, onBack, onSupportToast }: { user: User; onBack: () => void; onSupportToast: () => void }) {
  const { lang, setLang } = useLocale()
  const [theme, setThemeState] = useState(getTheme())

  function toggleTheme(next: 'light' | 'dark') {
    setTheme(next)
    setThemeState(next)
  }

  return (
    <div class="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div class="bg-white px-5 pt-12 pb-5 flex items-center gap-4 border-b border-gray-100">
        <button
          type="button"
          onClick={onBack}
          class="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center active:bg-gray-200 transition-colors text-gray-600 text-lg font-light"
        >
          ‹
        </button>
        <p class="text-xl font-bold text-gray-900">Меню</p>
      </div>

      <div class="flex-1 px-4 py-5 flex flex-col gap-4">
        {/* User info */}
        <div class="bg-white rounded-2xl px-4 py-4 border border-gray-100 flex items-center gap-3">
          <div class="w-11 h-11 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
            <UserIcon size={20} class="text-blue-500" />
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-semibold text-gray-900">{user.first_name}{user.last_name ? ` ${user.last_name}` : ''}</p>
            {user.phone && <p class="text-xs text-gray-400 mt-0.5">{user.phone}</p>}
          </div>
        </div>

        {/* Theme */}
        <div class="bg-white rounded-2xl px-4 py-4 border border-gray-100">
          <p class="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Тема</p>
          <div class="flex gap-2">
            <button
              type="button"
              onClick={() => toggleTheme('light')}
              class={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 text-sm font-medium transition-colors ${
                theme === 'light'
                  ? 'border-green-600 bg-green-50 text-green-700'
                  : 'border-gray-200 bg-gray-50 text-gray-500'
              }`}
            >
              <Sun size={16} />
              Светлая
            </button>
            <button
              type="button"
              onClick={() => toggleTheme('dark')}
              class={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 text-sm font-medium transition-colors ${
                theme === 'dark'
                  ? 'border-green-600 bg-green-50 text-green-700'
                  : 'border-gray-200 bg-gray-50 text-gray-500'
              }`}
            >
              <Moon size={16} />
              Тёмная
            </button>
          </div>
        </div>

        {/* Language */}
        <div class="bg-white rounded-2xl px-4 py-4 border border-gray-100">
          <p class="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Язык</p>
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
                <span class={`text-xs font-medium ${lang === id ? 'text-green-700' : 'text-gray-500'}`}>
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
            onClick={onSupportToast}
            class="w-full flex items-center gap-3 px-4 py-4 active:bg-gray-50 transition-colors text-left"
          >
            <div class="w-9 h-9 rounded-xl bg-green-100 flex items-center justify-center shrink-0">
              <MessageCircle size={18} class="text-green-600" />
            </div>
            <p class="flex-1 text-sm font-medium text-gray-900">Поддержка</p>
            <ChevronRight size={16} class="text-gray-300" />
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Hub Screen ───────────────────────────────────────────────────────────────

type View =
  | 'hub' | 'cleaning' | 'chistomaty' | 'menu' | 'active_order' | 'active_chistomaty'
  | { name: 'chat'; orderId: string; executorId: string | null; executorName: string; senderId: string }

interface Props {
  user: User
}

export function HubScreen({ user }: Props) {
  const [view, setView] = useState<View>('hub')
  const [activeOrder, setActiveOrder] = useState<Order | null | 'loading'>('loading')
  const [activeChistomatyOrder, setActiveChistomatyOrder] = useState<ChistomatyOrder | null>(null)
  const [historyOrders, setHistoryOrders] = useState<Order[]>([])
  const [toast, setToast] = useState<string | null>(null)
  const { state: addressState } = useAddresses(user.telegram_id)
  const { t } = useLocale()
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    getUserOrders(user.telegram_id)
      .then(res => {
        const active = res.items.find(o => ACTIVE_STATUSES.has(o.status)) ?? null
        setActiveOrder(active)
        setHistoryOrders(res.items.filter(o => HISTORY_STATUSES.has(o.status)))
        if (active) startPolling()
      })
      .catch(() => setActiveOrder(null))
    return stopPolling
  }, [user.telegram_id])

  function startPolling() {
    if (pollRef.current) return
    pollRef.current = setInterval(async () => {
      try {
        const res = await getUserOrders(user.telegram_id)
        const active = res.items.find(o => ACTIVE_STATUSES.has(o.status)) ?? null
        setActiveOrder(active)
        if (!active) stopPolling()
      } catch {}
    }, 12000)
  }

  function stopPolling() {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
  }

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  if (typeof view === 'object' && view.name === 'chat') {
    return (
      <ChatScreen
        orderId={view.orderId}
        executorId={view.executorId}
        executorName={view.executorName}
        senderId={view.senderId}
        readonly={false}
        onBack={() => setView('active_order')}
      />
    )
  }

  if (view === 'active_order' && activeOrder && activeOrder !== 'loading') {
    const onOrderDone = () => { stopPolling(); setActiveOrder(null); setView('hub') }

    if (activeOrder.housing_type === 'house') {
      return (
        <HouseOrderStatusScreen
          order={activeOrder}
          onBack={() => setView('hub')}
          onChatClick={() => setView({
            name: 'chat',
            orderId: activeOrder.id,
            executorId: activeOrder.foreman_id ?? null,
            executorName: activeOrder.foreman_name ?? 'Бригадир',
            senderId: String(user.telegram_id),
          })}
          onOrderCancelled={onOrderDone}
          onOrderAccepted={onOrderDone}
          onOrderUpdated={updated => setActiveOrder(updated)}
        />
      )
    }

    return (
      <ActiveOrderScreen
        order={activeOrder}
        onBack={() => setView('hub')}
        onChatClick={(orderId, executorId, executorName) => setView({
          name: 'chat',
          orderId,
          executorId,
          executorName,
          senderId: String(user.telegram_id),
        })}
        onOrderCancelled={onOrderDone}
        onOrderAccepted={onOrderDone}
        onSupportClick={() => showToast('Скоро появится')}
        onEditClick={() => showToast('Скоро появится')}
      />
    )
  }

  if (view === 'active_chistomaty' && activeChistomatyOrder) {
    return (
      <ActiveChistomatyScreen
        order={activeChistomatyOrder}
        onBack={() => setView('hub')}
        onSupportClick={() => { setView('hub'); showToast('Скоро появится') }}
      />
    )
  }

  if (view === 'cleaning') {
    return <OrderScreen user={user} onBack={() => setView('hub')} />
  }

  if (view === 'chistomaty') {
    return <ChistomatyScreen onBack={() => setView('hub')} />
  }

  if (view === 'menu') {
    return (
      <MenuScreen
        user={user}
        onBack={() => setView('hub')}
        onSupportToast={() => showToast('Скоро появится')}
      />
    )
  }

  const addresses = addressState.status === 'success' ? addressState.data.slice(0, 3) : []

  return (
    <div class="min-h-screen bg-white flex flex-col">

      {/* Header */}
      <div class="px-5 pt-12 pb-5 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setView('menu')}
          class="w-9 h-9 rounded-full bg-gray-100 flex flex-col items-center justify-center gap-1 active:bg-gray-200 transition-colors"
        >
          <span class="w-4 h-0.5 bg-gray-600 rounded-full" />
          <span class="w-4 h-0.5 bg-gray-600 rounded-full" />
          <span class="w-4 h-0.5 bg-gray-600 rounded-full" />
        </button>
        <p class="text-3xl font-bold" style="color:#44973A;letter-spacing:-0.5px">
          Chaqqon
        </p>
        <button
          type="button"
          class="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-base active:bg-gray-200 transition-colors"
        >
          <UserIcon size={18} class="text-gray-600" />
        </button>
      </div>

      {/* Active order banners */}
      {activeOrder && activeOrder !== 'loading' && (
        <ActiveOrderBanner
          order={activeOrder}
          onClick={() => setView('active_order')}
        />
      )}
      {activeChistomatyOrder && (
        <ChistomatyOrderBanner
          order={activeChistomatyOrder}
          onClick={() => setView('active_chistomaty')}
        />
      )}

      {/* Service tiles — boxes и лейблы разделены чтобы высоты совпадали */}
      <div class="px-4 pb-6">
        <div class="flex gap-3">
          <button
            type="button"
            onClick={() => setView('cleaning')}
            class="flex-[2] relative aspect-square bg-white rounded-3xl border border-gray-100 shadow-sm p-2 flex items-center justify-center active:scale-[0.97] transition-transform"
          >
            <img src="/service_tiles/cleaning.png" alt="Клининг" class="w-full h-full object-contain" />
            <p class="absolute bottom-0 left-0 right-0 text-sm font-semibold text-gray-900 text-center">Клининг</p>
          </button>

          <div class="flex-1 flex flex-col gap-3">
            <button
              type="button"
              onClick={() => showToast('Скоро появится')}
              class="flex-1 relative bg-white rounded-3xl border border-gray-100 shadow-sm p-2 flex items-center justify-center active:scale-[0.97] transition-transform"
            >
              <span class="absolute top-2 right-2 bg-gray-100 text-gray-500 text-[9px] font-semibold px-1.5 py-0.5 rounded-full">Скоро</span>
              <img src="/service_tiles/handyman.png" alt="Хэндимен" class="w-full h-full object-contain" />
              <p class="absolute bottom-0 left-0 right-0 text-sm font-semibold text-gray-900 text-center">Хэндимен</p>
            </button>
            <button
              type="button"
              onClick={() => setView('chistomaty')}
              class="flex-1 relative bg-white rounded-3xl border border-gray-100 shadow-sm p-2 flex items-center justify-center active:scale-[0.97] transition-transform"
            >
              <img src="/service_tiles/chistomaty.png" alt="Чистоматы" class="w-full h-full object-contain" />
              <p class="absolute bottom-0 left-0 right-0 text-sm font-semibold text-gray-900 text-center">Чистоматы</p>
            </button>
          </div>
        </div>
      </div>

      {/* Saved addresses */}
      {addresses.length > 0 && (
        <div class="px-4 flex flex-col gap-2">
          <p class="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-1">
            {t('home_saved_addresses')}
          </p>
          {addresses.map(addr => (
            <AddressChip
              key={addr.id}
              address={addr.address}
              onClick={() => setView('cleaning')}
            />
          ))}
        </div>
      )}

      {/* Order history */}
      <div class="px-4 mt-6 pb-8 flex flex-col gap-2">
        <p class="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-1">
          История заказов
        </p>
        {historyOrders.length > 0 ? (
          historyOrders.map(order => (
            <OrderHistoryItem key={order.id} order={order} />
          ))
        ) : (
          <div class="bg-gray-50 rounded-2xl px-4 py-6 flex flex-col items-center gap-2">
            <p class="text-sm font-semibold text-gray-700">Сделайте первый заказ</p>
            <p class="text-xs text-gray-400 text-center">История ваших уборок появится здесь</p>
          </div>
        )}
      </div>

      {toast && <ComingSoonToast message={toast} />}
    </div>
  )
}
