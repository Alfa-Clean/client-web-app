// Dev-only UI Kit. Access at ?uikit=1
import { useState } from 'preact/hooks'
import { getTheme, setTheme } from '../hooks/useTheme'
import { MapPicker } from '../components/MapPicker'
import { AddonPicker } from '../components/AddonPicker'
import { AddressOption } from '../components/AddressOption'
import { ChistomatyOrderBanner } from './HubScreen'
import type { ChistomatyOrder } from './ActiveChistomatyScreen'
import {
  ViewA1, ViewA2, ViewA3, ViewA4, ViewA5, ViewA6, ViewA7,
} from './HouseOrderStatusScreen'
import {
  B1_Assessment, B2_PriceSubmitted, B3_PriceRejected,
  B4_TeamFormation, B5_InProgress, B6_Awaiting,
  OrderMetaCard,
} from './BrigadierOrderScreen'
import { ActiveOrderBanner, ACTIVE_ORDER_STATUS_LABEL } from './HubScreen'
import type { Order } from '../api/orders'

// ─── Design Tokens ────────────────────────────────────────────────────────────

export const COLORS = {
  primary: {
    50:  '#F0F9EE',
    100: '#E0F3DC',
    200: '#BDE5B6',
    300: '#8FCF86',
    400: '#6DB363',
    500: '#44973A',  // brand
    600: '#357A2C',
    700: '#2D6126',
    800: '#1E4219',
    900: '#112610',
  },
  neutral: {
    0:   '#FFFFFF',
    50:  '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827',
  },
  status: {
    new:                  { bg: '#F3F4F6', text: '#6B7280' },
    assigned:             { bg: '#EFF6FF', text: '#3B82F6' },
    on_the_way:           { bg: '#F5F3FF', text: '#8B5CF6' },
    arrived:              { bg: '#FFFBEB', text: '#D97706' },
    in_progress:          { bg: '#F0F9EE', text: '#44973A' },
    awaiting_confirmation:{ bg: '#ECFDF5', text: '#059669' },
    completed:            { bg: '#F0F9EE', text: '#44973A' },
    cancelled:            { bg: '#FEF2F2', text: '#EF4444' },
  },
} as const

export const TYPOGRAPHY = {
  logo:    'text-3xl font-bold tracking-tight',
  h1:      'text-2xl font-bold',
  h2:      'text-xl font-semibold',
  h3:      'text-base font-semibold',
  body:    'text-sm',
  caption: 'text-xs text-gray-500',
  label:   'text-xs font-medium uppercase tracking-wide text-gray-400',
} as const

// ─── Component atoms ──────────────────────────────────────────────────────────

function Btn({
  label,
  variant = 'primary',
  disabled = false,
  loading = false,
  size = 'md',
}: {
  label: string
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  disabled?: boolean
  loading?: boolean
  size?: 'sm' | 'md'
}) {
  const base = `inline-flex items-center justify-center font-semibold rounded-2xl transition-all active:scale-95 ${
    size === 'sm' ? 'px-4 py-2 text-sm' : 'px-6 py-3.5 text-sm w-full'
  }`
  const variants = {
    primary:   'bg-[#44973A] text-white hover:bg-[#357A2C] disabled:bg-[#BDE5B6] disabled:text-white',
    secondary: 'bg-gray-100 text-gray-800 hover:bg-gray-200 disabled:opacity-40',
    ghost:     'border-2 border-[#44973A] text-[#44973A] hover:bg-[#F0F9EE] disabled:opacity-40',
    danger:    'bg-red-500 text-white hover:bg-red-600 disabled:opacity-40',
  }
  return (
    <button type="button" disabled={disabled || loading} class={`${base} ${variants[variant]}`}>
      {loading ? <span class="opacity-70">Загрузка...</span> : label}
    </button>
  )
}

function Badge({ label, status }: { label: string; status: keyof typeof COLORS.status }) {
  const c = COLORS.status[status]
  return (
    <span
      class="inline-block text-xs font-semibold px-2.5 py-1 rounded-full"
      style={{ background: c.bg, color: c.text }}
    >
      {label}
    </span>
  )
}

function ColorSwatch({ hex, name, light = false }: { hex: string; name: string; light?: boolean }) {
  return (
    <div class="flex flex-col items-center gap-1.5">
      <div
        class="w-12 h-12 rounded-xl shadow-sm border border-black/5"
        style={{ background: hex }}
      />
      <span class={`text-[10px] font-mono ${light ? 'text-gray-300' : 'text-gray-600'}`}>{hex}</span>
      <span class={`text-[10px] ${light ? 'text-gray-400' : 'text-gray-400'}`}>{name}</span>
    </div>
  )
}

function Section({ title, children }: { title: string; children: preact.ComponentChildren }) {
  return (
    <section class="mb-10">
      <p class="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-4 px-4">{title}</p>
      <div class="px-4">{children}</div>
    </section>
  )
}

function Divider() {
  return <div class="h-px bg-gray-100 my-6" />
}

// ─── Service Card atoms ───────────────────────────────────────────────────────

function ServiceCardLarge({ label, image, soon = false }: { label: string; image: string; soon?: boolean }) {
  return (
    <div class="flex flex-col gap-2">
      <div class="relative bg-white rounded-3xl border border-gray-100 shadow-sm aspect-square flex items-center justify-center p-2 w-full">
        {soon && (
          <span class="absolute top-3 right-3 z-10 bg-gray-100 text-gray-500 text-[10px] font-semibold px-2 py-0.5 rounded-full">
            Скоро
          </span>
        )}
        <img src={image} alt={label} class="w-full h-full object-contain" />
      </div>
      <p class="text-sm font-semibold text-gray-900 text-center">{label}</p>
    </div>
  )
}

function ServiceCardSmall({ label, image, soon = false }: { label: string; image: string; soon?: boolean }) {
  return (
    <div class="flex flex-col gap-2">
      <div class="relative bg-white rounded-3xl border border-gray-100 shadow-sm aspect-square flex items-center justify-center p-1.5 w-full">
        {soon && (
          <span class="absolute top-2 right-2 z-10 bg-gray-100 text-gray-500 text-[9px] font-semibold px-1.5 py-0.5 rounded-full">
            Скоро
          </span>
        )}
        <img src={image} alt={label} class="w-full h-full object-contain" />
      </div>
      <p class="text-[11px] font-semibold text-gray-900 text-center leading-tight">{label}</p>
    </div>
  )
}

// ─── Address Chip ─────────────────────────────────────────────────────────────

function AddressChip({ address, active = false, housingType = 'apt' }: { address: string; active?: boolean; housingType?: 'apt' | 'house' }) {
  return (
    <div class={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-colors ${
      active ? 'bg-[#E0F3DC] border border-[#44973A]/30' : 'bg-gray-100 border border-transparent'
    }`}>
      <span class={`shrink-0 ${active ? 'text-[#44973A]' : 'text-gray-400'}`}>
        {housingType === 'house' ? (
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M2 8.5L9 2l7 6.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M4 7v8h10V7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            <rect x="6.5" y="11" width="5" height="4" rx="0.5" stroke="currentColor" stroke-width="1.3"/>
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <rect x="2" y="2" width="14" height="14" rx="2" stroke="currentColor" stroke-width="1.5"/>
            <path d="M6 2v14" stroke="currentColor" stroke-width="1.3" stroke-dasharray="2 2"/>
            <path d="M12 2v14" stroke="currentColor" stroke-width="1.3" stroke-dasharray="2 2"/>
            <path d="M2 7h14M2 12h14" stroke="currentColor" stroke-width="1.3" stroke-dasharray="2 2"/>
          </svg>
        )}
      </span>
      <p class={`text-sm font-medium truncate ${active ? 'text-[#2D6126]' : 'text-gray-700'}`}>
        {address}
      </p>
    </div>
  )
}

// ─── Order Banner ─────────────────────────────────────────────────────────────

function OrderBanner({
  status,
  address,
  executorName,
}: {
  status: string
  address: string
  executorName: string
}) {
  return (
    <div class="bg-[#44973A] rounded-2xl px-4 py-3.5 flex items-center gap-3">
      {/* Avatar placeholder */}
      <div class="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0 text-xl">
        👤
      </div>
      <div class="flex-1 min-w-0">
        <p class="text-white font-bold text-sm leading-tight">{status}</p>
        <p class="text-white/70 text-xs truncate mt-0.5">{address}</p>
        <p class="text-white/60 text-xs">{executorName}</p>
      </div>
      <div class="shrink-0 text-right">
        <p class="text-white font-mono font-bold text-base">1:46:15</p>
        <p class="text-white/50 text-[10px]">осталось</p>
      </div>
    </div>
  )
}

// ─── Input atoms ──────────────────────────────────────────────────────────────

function SearchBar({ placeholder = 'Адрес' }: { placeholder?: string }) {
  return (
    <div class="flex items-center gap-3 bg-gray-100 rounded-2xl px-4 py-3">
      <span class="text-gray-400 text-base leading-none">🔍</span>
      <span class="text-sm text-gray-400">{placeholder}</span>
    </div>
  )
}

function InputField({ label, placeholder, value }: { label: string; placeholder: string; value?: string }) {
  return (
    <div class="flex flex-col gap-1.5">
      <label class="text-xs font-medium text-gray-500">{label}</label>
      <div class="bg-white border border-gray-200 rounded-2xl px-4 py-3">
        <span class={`text-sm ${value ? 'text-gray-900' : 'text-gray-400'}`}>
          {value ?? placeholder}
        </span>
      </div>
    </div>
  )
}

// ─── Progress Steps ───────────────────────────────────────────────────────────

function StepProgress({ total, current }: { total: number; current: number }) {
  return (
    <div class="flex gap-1.5">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          class="flex-1 h-1 rounded-full transition-colors"
          style={{
            background: i < current ? '#44973A' : i === current ? '#44973A' : '#E5E7EB',
            opacity: i === current ? 1 : i < current ? 0.6 : 1,
          }}
        />
      ))}
    </div>
  )
}

// ─── Order History Item ───────────────────────────────────────────────────────

function OrderHistoryItem({
  service,
  address,
  date,
  price,
  status,
}: {
  service: string
  address: string
  date: string
  price: string
  status: 'completed' | 'cancelled'
}) {
  const c = COLORS.status[status]
  const statusLabel = status === 'completed' ? 'Завершён' : 'Отменён'
  return (
    <div class="bg-white rounded-2xl border border-gray-100 px-4 py-3.5 flex items-center gap-3">
      <div
        class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-lg"
        style={{ background: c.bg }}
      >
        🧹
      </div>
      <div class="flex-1 min-w-0">
        <div class="flex items-center justify-between gap-2">
          <p class="text-sm font-semibold text-gray-900">{service}</p>
          <span
            class="text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0"
            style={{ background: c.bg, color: c.text }}
          >
            {statusLabel}
          </span>
        </div>
        <p class="text-xs text-gray-500 truncate mt-0.5">{address}</p>
        <div class="flex items-center justify-between mt-1">
          <p class="text-[11px] text-gray-400">{date}</p>
          <p class="text-sm font-semibold text-gray-900">{price}</p>
        </div>
      </div>
    </div>
  )
}

// ─── Main UI Kit Screen ───────────────────────────────────────────────────────

export function UIKitScreen() {
  const [theme, setThemeState] = useState(getTheme())
  const [page, setPage] = useState<'system' | 'brigadier' | 'handyman'>('system')

  function toggleTheme() {
    const next = theme === 'light' ? 'dark' : 'light'
    setTheme(next)
    setThemeState(next)
  }

  return (
    <div class="min-h-screen bg-gray-50 pb-16">
      {/* Header */}
      <div class="bg-white border-b border-gray-100 px-4 pt-12 pb-0 sticky top-0 z-10">
        <div class="flex items-start justify-between mb-3">
          <div>
            <p class="text-[10px] font-semibold uppercase tracking-widest text-[#44973A] mb-1">UI Kit</p>
            <h1 class="text-2xl font-bold text-gray-900">
              <span style="color:#44973A">Chaqqon</span> Design System
            </h1>
            <p class="text-xs text-gray-400 mt-1">v1.0 · dev only · ?uikit=1</p>
          </div>
          <button
            type="button"
            onClick={toggleTheme}
            style={`width:48px;height:28px;border-radius:14px;position:relative;transition:background 0.2s;background:${theme === 'dark' ? '#44973A' : '#d1d5db'};margin-top:8px;flex-shrink:0`}
          >
            <span style={`position:absolute;top:3px;width:22px;height:22px;border-radius:50%;background:white;box-shadow:0 1px 3px rgba(0,0,0,.3);transition:left 0.2s;left:${theme === 'dark' ? '23px' : '3px'}`} />
          </button>
        </div>
        <div class="flex -mx-4">
          {(['system', 'brigadier', 'handyman'] as const).map(p => (
            <button key={p} type="button" onClick={() => setPage(p)}
              class={`flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors ${page === p ? 'border-[#44973A] text-[#44973A]' : 'border-transparent text-gray-400'}`}
            >
              {p === 'system' ? 'Design System' : p === 'brigadier' ? 'Дом (клиент)' : 'Хэндимен'}
            </button>
          ))}
        </div>
      </div>

      {page === 'brigadier' && <BrigadierDemoPage />}
      {page === 'handyman' && <HandymanDemoPage />}
      <div class={`pt-6 max-w-[1000px] mx-auto${page !== 'system' ? ' hidden' : ''}`}>

        {/* ── BRAND ── */}
        <Section title="Brand · Логотип">
          <div class="flex flex-col gap-4">
            <div class="bg-white rounded-2xl border border-gray-100 p-6 flex flex-col items-center gap-3">
              <p class="text-4xl font-bold" style="color:#44973A;letter-spacing:-1px">Chaqqon</p>
              <p class="text-xs text-gray-400">Wordmark / Primary</p>
            </div>
            <div class="bg-[#44973A] rounded-2xl border border-gray-100 p-6 flex flex-col items-center gap-3">
              <p class="text-4xl font-bold text-white" style="letter-spacing:-1px">Chaqqon</p>
              <p class="text-xs text-white/50">Wordmark / White</p>
            </div>
          </div>
        </Section>

        <Divider />

        {/* ── COLORS: PRIMARY ── */}
        <Section title="Colors · Primary Green">
          <div class="flex gap-3 overflow-x-auto pb-2" style="scrollbar-width:none">
            {Object.entries(COLORS.primary).map(([key, hex]) => (
              <ColorSwatch key={key} hex={hex} name={key} />
            ))}
          </div>
        </Section>

        {/* ── COLORS: NEUTRAL ── */}
        <Section title="Colors · Neutral">
          <div class="flex gap-3 overflow-x-auto pb-2" style="scrollbar-width:none">
            {Object.entries(COLORS.neutral).slice(1).map(([key, hex]) => (
              <ColorSwatch key={key} hex={hex} name={key} />
            ))}
          </div>
        </Section>

        {/* ── COLORS: STATUS ── */}
        <Section title="Colors · Status">
          <div class="flex flex-wrap gap-2">
            {Object.entries(COLORS.status).map(([key, c]) => (
              <div key={key} class="flex flex-col items-center gap-1.5">
                <div
                  class="w-12 h-7 rounded-lg"
                  style={{ background: c.bg, border: `2px solid ${c.text}22` }}
                />
                <span class="text-[10px] font-mono" style={{ color: c.text }}>{c.text}</span>
                <span class="text-[10px] text-gray-400">{key.replace(/_/g,' ')}</span>
              </div>
            ))}
          </div>
        </Section>

        <Divider />

        {/* ── TYPOGRAPHY ── */}
        <Section title="Typography">
          <div class="bg-white rounded-2xl border border-gray-100 p-5 flex flex-col gap-4">
            <div>
              <p class="text-[10px] text-gray-400 mb-1">Logo / 30px Bold</p>
              <p class="text-3xl font-bold" style="color:#44973A;letter-spacing:-0.5px">Chaqqon</p>
            </div>
            <div class="h-px bg-gray-100" />
            <div>
              <p class="text-[10px] text-gray-400 mb-1">H1 / 24px Bold</p>
              <p class="text-2xl font-bold text-gray-900">Выберите услугу</p>
            </div>
            <div class="h-px bg-gray-100" />
            <div>
              <p class="text-[10px] text-gray-400 mb-1">H2 / 20px Semibold</p>
              <p class="text-xl font-semibold text-gray-900">Активный заказ</p>
            </div>
            <div class="h-px bg-gray-100" />
            <div>
              <p class="text-[10px] text-gray-400 mb-1">H3 / 16px Semibold</p>
              <p class="text-base font-semibold text-gray-900">Клининг квартиры</p>
            </div>
            <div class="h-px bg-gray-100" />
            <div>
              <p class="text-[10px] text-gray-400 mb-1">Body / 14px Regular</p>
              <p class="text-sm text-gray-700">Стандартная уборка квартиры, включает уборку всех комнат и санузлов.</p>
              <p class="text-sm text-gray-700 mt-2">Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation.</p>
            </div>
            <div class="h-px bg-gray-100" />
            <div>
              <p class="text-[10px] text-gray-400 mb-1">Caption / 12px Regular</p>
              <p class="text-xs text-gray-500">подъезд 3, эт. 5, кв. 12</p>
            </div>
            <div class="h-px bg-gray-100" />
            <div>
              <p class="text-[10px] text-gray-400 mb-1">Label / 10px Semibold Uppercase</p>
              <p class="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Сохранённые адреса</p>
            </div>
          </div>
        </Section>

        <Divider />

        {/* ── BUTTONS ── */}
        <Section title="Buttons">
          <div class="flex flex-col gap-3">
            <div>
              <p class="text-[10px] text-gray-400 mb-2">Primary</p>
              <Btn label="Заказать уборку" variant="primary" />
            </div>
            <div>
              <p class="text-[10px] text-gray-400 mb-2">Secondary</p>
              <Btn label="Отмена" variant="secondary" />
            </div>
            <div>
              <p class="text-[10px] text-gray-400 mb-2">Ghost</p>
              <Btn label="Повторить заказ" variant="ghost" />
            </div>
            <div>
              <p class="text-[10px] text-gray-400 mb-2">Danger</p>
              <Btn label="Отменить заказ" variant="danger" />
            </div>
            <div class="flex gap-2">
              <div class="flex-1">
                <p class="text-[10px] text-gray-400 mb-2">Loading</p>
                <Btn label="Загрузка" variant="primary" loading />
              </div>
              <div class="flex-1">
                <p class="text-[10px] text-gray-400 mb-2">Disabled</p>
                <Btn label="Продолжить" variant="primary" disabled />
              </div>
            </div>
          </div>
        </Section>

        <Divider />

        {/* ── SERVICE CARDS ── */}
        <Section title="Service Cards · Карточки вертикалей">
          <p class="text-[10px] text-gray-400 mb-3">Компоновка главного экрана</p>
          <div style="display:grid;grid-template-columns:2fr 1fr;grid-template-rows:auto auto;gap:12px">
            <div style="grid-row:1/3">
              <ServiceCardLarge label="Клининг" image="/service_tiles/cleaning.png" />
            </div>
            <ServiceCardSmall label="Хэндимен" image="/service_tiles/handyman.png" soon />
            <ServiceCardSmall label="Чистоматы" image="/service_tiles/chistomaty.png" soon />
          </div>
          <div class="mt-4 flex flex-col gap-3">
            <p class="text-[10px] text-gray-400">Карточки по отдельности</p>
            <div class="flex gap-3">
              <div class="flex-1">
                <p class="text-[10px] text-gray-400 mb-2">Large · Клининг</p>
                <ServiceCardLarge label="Клининг" image="/service_tiles/cleaning.png" />
              </div>
              <div class="flex-1">
                <p class="text-[10px] text-gray-400 mb-2">Small · Хэндимен</p>
                <ServiceCardSmall label="Хэндимен" image="/service_tiles/handyman.png" soon />
              </div>
              <div class="flex-1">
                <p class="text-[10px] text-gray-400 mb-2">Small · Чистоматы</p>
                <ServiceCardSmall label="Чистоматы" image="/service_tiles/chistomaty.png" soon />
              </div>
            </div>
          </div>
        </Section>

        <Divider />

        {/* ── STATUS BADGES ── */}
        <Section title="Status Badges · Статусы заказа">
          <div class="flex flex-wrap gap-2">
            <Badge label="Ищем клинера" status="new" />
            <Badge label="Назначен" status="assigned" />
            <Badge label="Едет" status="on_the_way" />
            <Badge label="Прибыл" status="arrived" />
            <Badge label="Убирает" status="in_progress" />
            <Badge label="Ожидает" status="awaiting_confirmation" />
            <Badge label="Завершён" status="completed" />
            <Badge label="Отменён" status="cancelled" />
          </div>
        </Section>

        <Divider />

        {/* ── ORDER BANNER ── */}
        <Section title="Order Banner · Баннер активного заказа">
          <div class="flex flex-col gap-3">
            <div>
              <p class="text-[10px] text-gray-400 mb-2">In progress</p>
              <OrderBanner
                status="Убирают"
                address="Карасу-2, 39"
                executorName="Малика Юсупова"
              />
            </div>
            <div>
              <p class="text-[10px] text-gray-400 mb-2">Awaiting confirmation</p>
              <OrderBanner
                status="Примите работу"
                address="ул. Насирходжа, 72"
                executorName="Нилуфар Рашидова"
              />
            </div>
          </div>
        </Section>

        <Divider />

        {/* ── CHISTOMATY BANNER ── */}
        <Section title="Chistomaty Banner · Баннер активного заказа Чистоматы">
          {(() => {
            const MOCK: Record<ChistomatyOrder['status'], ChistomatyOrder> = {
              received:  { id: '1', order_num: 42, status: 'received',  postamat_address: 'ТЦ Samarqand Darvoza, 1 этаж', created_at: '', items_count: 5, price: 95000, estimated_ready: '23 мая, 14:00' },
              washing:   { id: '2', order_num: 43, status: 'washing',   postamat_address: 'ул. Навои, 30',                 created_at: '', items_count: 3, price: 60000, estimated_ready: '23 мая, 16:00' },
              drying:    { id: '3', order_num: 44, status: 'drying',    postamat_address: 'ТЦ Komplex, вход со двора',     created_at: '', items_count: 3, price: 60000, estimated_ready: '23 мая, 18:00' },
              ready:     { id: '4', order_num: 45, status: 'ready',     postamat_address: 'Юнусабад, 19-квартал, 8',       created_at: '', items_count: 4, price: 80000 },
              collected: { id: '5', order_num: 46, status: 'collected', postamat_address: 'ТЦ Samarqand Darvoza, 1 этаж', created_at: '', items_count: 5, price: 95000 },
            }
            return (
              <div class="flex flex-col gap-3">
                {(Object.keys(MOCK) as ChistomatyOrder['status'][]).map(status => (
                  <div key={status}>
                    <p class="text-[10px] text-gray-400 mb-2 capitalize">{status}</p>
                    <ChistomatyOrderBanner order={MOCK[status]} onClick={() => {}} />
                  </div>
                ))}
              </div>
            )
          })()}
        </Section>

        <Divider />

        {/* ── ORDER HISTORY ── */}
        <Section title="Order History · История заказов">
          <div class="flex flex-col gap-2">
            <OrderHistoryItem
              service="Клининг"
              address="Карасу-2, 39"
              date="21 мая, 14:00"
              price="350 000 сум"
              status="completed"
            />
            <OrderHistoryItem
              service="Клининг"
              address="ул. Насирходжа, 72"
              date="15 мая, 10:00"
              price="280 000 сум"
              status="cancelled"
            />
            <OrderHistoryItem
              service="Клининг"
              address="Юнусабад, 19-квартал, 8"
              date="3 мая, 12:00"
              price="420 000 сум"
              status="completed"
            />
          </div>
        </Section>

        <Divider />

        {/* ── ADDRESS CHIPS ── */}
        <Section title="Address Chips · Чипы адресов">
          <div class="flex flex-col gap-2">
            <AddressChip address="Карасу-2, 39" active />
            <AddressChip address="ул. Насирходжа, 72" />
            <AddressChip address="Юнусабад, 19-квартал, 8" housingType="house" />
            <div class="flex items-center gap-3 px-4 py-3 rounded-2xl border-2 border-dashed border-gray-200">
              <span class="text-lg leading-none">+</span>
              <p class="text-sm text-gray-400">Добавить адрес</p>
            </div>
          </div>
        </Section>

        <Divider />

        {/* ── ADDRESS OPTION ── */}
        <Section title="Address Option · Опция адреса">
          <div class="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <AddressOption address="Карасу-2, д. 39" label="Дом" housingType="apt" active onClick={() => {}} />
            <AddressOption address="ул. Насирходжа, 72" label="Работа" housingType="apt" onClick={() => {}} />
            <AddressOption address="Юнусабад, 19-квартал, 8" housingType="house" onClick={() => {}} />
          </div>
        </Section>

        <Divider />

        {/* ── ADDRESS DROPDOWN ── */}
        <Section title="Address Dropdown · Выбор адреса">
          {(() => {
            const MOCK_ADDRESSES = [
              { id: 'a1', address: 'Карасу-2, д. 39', label: 'Дом', housing_type: 'apt' as const },
              { id: 'a2', address: 'ул. Насирходжа, 72', label: 'Работа', housing_type: 'apt' as const },
              { id: 'a3', address: 'Юнусабад, 19-квартал, 8', label: null, housing_type: 'house' as const },
            ]
            const [open, setOpen] = useState(false)
            const [selected, setSelected] = useState<typeof MOCK_ADDRESSES[0] | null>(null)
            return (
              <div class="flex flex-col gap-6">
                <div>
                  <p class="text-[10px] text-gray-400 mb-2">Пустой (адрес не выбран)</p>
                  <div class="relative">
                    <button
                      type="button"
                      onClick={() => setOpen(v => !v)}
                      class={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl border-2 bg-white text-left transition-colors ${open ? 'border-[#44973A]' : 'border-gray-200'}`}
                    >
                      <p class="text-sm text-gray-400">{selected ? selected.address : 'Адрес'}</p>
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" class={`shrink-0 ml-2 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}>
                        <path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                      </svg>
                    </button>
                    {open && (
                      <>
                        <div class="fixed inset-0 z-10" onClick={() => setOpen(false)} />
                        <div class="absolute left-0 right-0 top-[calc(100%+6px)] z-20 bg-white rounded-2xl border border-gray-100 shadow-lg overflow-hidden">
                          {MOCK_ADDRESSES.map(addr => (
                            <AddressOption
                              key={addr.id}
                              address={addr.address}
                              label={addr.label}
                              housingType={addr.housing_type}
                              active={selected?.id === addr.id}
                              onClick={() => { setSelected(addr); setOpen(false) }}
                            />
                          ))}
                          <button
                            type="button"
                            onClick={() => setOpen(false)}
                            class="w-full flex items-center gap-3 px-4 py-3 text-left active:bg-gray-50 transition-colors border-t border-gray-100"
                          >
                            <div class="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center shrink-0 text-gray-500 text-sm font-light">+</div>
                            <p class="text-sm font-medium text-gray-500">Создать новый адрес</p>
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )
          })()}
        </Section>

        <Divider />

        {/* ── INPUTS ── */}
        <Section title="Inputs · Поля ввода">
          <div class="flex flex-col gap-4">
            <div>
              <p class="text-[10px] text-gray-400 mb-2">Search Bar</p>
              <SearchBar placeholder="Адрес" />
            </div>
            <div>
              <p class="text-[10px] text-gray-400 mb-2">Text Input (empty)</p>
              <InputField label="Адрес*" placeholder="ул. Навои 5" />
            </div>
            <div>
              <p class="text-[10px] text-gray-400 mb-2">Text Input (filled)</p>
              <InputField label="Адрес*" placeholder="" value="Карасу-2, 39" />
            </div>
          </div>
        </Section>

        <Divider />

        {/* ── PROGRESS BAR ── */}
        <Section title="Step Progress · Прогресс заказа">
          <div class="bg-white rounded-2xl border border-gray-100 p-5 flex flex-col gap-5">
            <div>
              <p class="text-[10px] text-gray-400 mb-3">Шаг 1 из 4 (дом)</p>
              <StepProgress total={4} current={0} />
            </div>
            <div>
              <p class="text-[10px] text-gray-400 mb-3">Шаг 3 из 7 (квартира)</p>
              <StepProgress total={7} current={2} />
            </div>
            <div>
              <p class="text-[10px] text-gray-400 mb-3">Последний шаг</p>
              <StepProgress total={7} current={6} />
            </div>
          </div>
        </Section>

        <Divider />

        {/* ── HOUSE ORDER FLOW ── */}
        {(() => {
          const BASE: Order = {
            id: 'h1', order_num: 42, status: 'new', service_type: 'standard',
            housing_type: 'house', rooms: 0, bathrooms: 0, price: 320000,
            address: 'Юнусабад, 19-квартал, д. 8', order_date: '2026-05-26',
            order_slot: '09:00–12:00', addons: [], created_at: '',
            foreman_name: 'Амаль Зафаров', foreman_rating: 4.8,
            submitted_price: 320000, price_comment: 'Уборка 3 комнат, кухня, 2 санузла. Включены все поверхности.',
            team_members: [
              { executor_id: 'f', name: 'Амаль Зафаров', role: 'foreman' },
              { executor_id: 'c1', name: 'Малика Юсупова', role: 'cleaner' },
              { executor_id: 'c2', name: 'Нилуфар Алиева', role: 'cleaner' },
            ],
          }
          const NOOP = () => {}
          const views: { label: string; screen: string; order: Order }[] = [
            { label: 'A1 — Поиск бригадира', screen: 'new', order: { ...BASE, status: 'new' } },
            { label: 'A2 — Бригадир едет', screen: 'assessment', order: { ...BASE, status: 'assessment' } },
            { label: 'A3 — Подтверждение цены ⭐', screen: 'price_submitted', order: { ...BASE, status: 'price_submitted' } },
            { label: 'A3b — Пересмотр цены (повтор)', screen: 'price_submitted_revised', order: { ...BASE, status: 'price_submitted', previous_price: 280000 } },
            { label: 'A4 — Ожидание новой цены', screen: 'price_rejected', order: { ...BASE, status: 'price_rejected', previous_price: 320000 } },
            { label: 'A5 — Команда формируется', screen: 'team_formation', order: { ...BASE, status: 'team_formation' } },
            { label: 'A6 — Уборка идёт', screen: 'in_progress', order: { ...BASE, status: 'in_progress' } },
            { label: 'A7 — Подтверждение завершения ⭐', screen: 'awaiting_confirmation', order: { ...BASE, status: 'awaiting_confirmation' } },
          ]
          return (
            <Section title="House Order · Флоу домового заказа (клиент A1–A7)">
              <div class="flex flex-col gap-6">
                {views.map(v => (
                  <div key={v.screen}>
                    <p class="text-[10px] text-gray-400 mb-2">{v.label}</p>
                    {v.order.status === 'new' && <ViewA1 order={v.order} onCancel={NOOP} loading={false} />}
                    {v.order.status === 'assessment' && <ViewA2 order={v.order} onChat={NOOP} onCancel={NOOP} loading={false} />}
                    {v.order.status === 'price_submitted' && <ViewA3 order={v.order} onConfirm={NOOP} onReject={NOOP} onCounter={NOOP} onCancel={NOOP} loading={false} />}
                    {v.order.status === 'price_rejected' && <ViewA4 order={v.order} onCancel={NOOP} loading={false} />}
                    {v.order.status === 'team_formation' && <ViewA5 order={v.order} onCancel={NOOP} loading={false} />}
                    {v.order.status === 'in_progress' && <ViewA6 order={v.order} onChat={NOOP} />}
                    {v.order.status === 'awaiting_confirmation' && <ViewA7 order={v.order} onAccept={NOOP} loading={false} onChat={NOOP} />}
                  </div>
                ))}
              </div>
            </Section>
          )
        })()}

        <Divider />

        {/* ── SPACING / BORDER RADIUS ── */}
        <Section title="Spacing & Radius">
          <div class="bg-white rounded-2xl border border-gray-100 p-5 flex flex-col gap-3">
            {[
              ['rounded-lg', '8px', 'Chips, small elements'],
              ['rounded-xl', '12px', 'Inputs, badges'],
              ['rounded-2xl', '16px', 'Cards, buttons'],
              ['rounded-3xl', '24px', 'Service cards, bottom sheet'],
            ].map(([cls, val, desc]) => (
              <div key={cls} class="flex items-center gap-3">
                <div class={`w-10 h-10 bg-[#44973A]/20 border-2 border-[#44973A]/30 shrink-0 ${cls}`} />
                <div>
                  <p class="text-xs font-mono text-gray-700">{cls}</p>
                  <p class="text-[10px] text-gray-400">{val} · {desc}</p>
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Divider />

        {/* ── ADDON PICKER ── */}
        <Section title="Addon Picker · Дополнительные услуги">
          {(() => {
            const MOCK_ADDONS = [
              { id: 'windows',      translations: { ru: 'Мытьё окон',         uz: 'Derazalarni yuvish' }, price: 50000, category_id: 'windows' },
              { id: 'balcony',      translations: { ru: 'Уборка балкона',      uz: 'Balkoni tozalash'   }, price: 40000, category_id: 'windows' },
              { id: 'oven_inside',  translations: { ru: 'Чистка духовки',      uz: 'Pechni tozalash'    }, price: 30000, category_id: 'kitchen' },
              { id: 'fridge_inside',translations: { ru: 'Чистка холодильника'                           }, price: 35000, category_id: 'kitchen' },
            ]
            const [sel, setSel] = useState<string[]>([])
            return (
              <div class="flex flex-col gap-4">
                <div>
                  <p class="text-[10px] text-gray-400 mb-2">Default (ничего не выбрано)</p>
                  <AddonPicker addons={MOCK_ADDONS} selected={[]} onChange={() => {}} />
                </div>
                <div>
                  <p class="text-[10px] text-gray-400 mb-2">Интерактивный (кликайте)</p>
                  <AddonPicker addons={MOCK_ADDONS} selected={sel} onChange={setSel} addMoreLabel="Добавить услуги" doneLabel="Готово" />
                  {sel.length > 0 && (
                    <p class="text-xs text-gray-400 mt-2">Выбрано: {sel.join(', ')}</p>
                  )}
                </div>
                <div>
                  <p class="text-[10px] text-gray-400 mb-2">lang=uz</p>
                  <AddonPicker addons={MOCK_ADDONS} selected={['windows', 'balcony']} lang="uz" onChange={() => {}} />
                </div>
              </div>
            )
          })()}
        </Section>

        <Divider />

        {/* ── MAP ── */}
        <Section title="Map · Карта (Yandex Maps v3)">
          <div class="flex flex-col gap-4">
            <div>
              <p class="text-[10px] text-gray-400 mb-2">Стандартный размер (h-56)</p>
              <MapPicker onLocationPick={(lat, lon) => console.log('picked:', lat, lon)} />
            </div>
            <div>
              <p class="text-[10px] text-gray-400 mb-2">Полноэкранный (h-96)</p>
              <div class="rounded-xl overflow-hidden" style="height:384px">
                <MapPicker
                  onLocationPick={(lat, lon) => console.log('picked:', lat, lon)}
                  initialLat={41.311}
                  initialLon={69.279}
                />
              </div>
            </div>
          </div>
        </Section>

        <Divider />

        {/* ── BRIGADIER: FULL SCREEN VIEWS ── */}
        <Section title="Brigadier · Полные экраны по статусам">
          {(() => {
            const noop = () => {}
            const BASE: Order = {
              id: 'b1', order_num: 77, status: 'assessment',
              service_type: 'house', housing_type: 'house',
              rooms: 4, bathrooms: 2, price: 0,
              address: 'Юнусабад, 19-квартал, д. 8',
              order_date: '2025-05-25', order_slot: '09:00–12:00',
              addons: [], created_at: '',
              foreman_name: 'Малика Юсупова', foreman_rating: 4.8,
              comment: 'Собака в комнате, не заходить',
              team_members: [
                { executor_id: 't1', name: 'Малика Юсупова', role: 'foreman' },
                { executor_id: 't2', name: 'Нилуфар Алиева', role: 'cleaner' },
                { executor_id: 't3', name: 'Зарина Камолова', role: 'cleaner' },
              ],
            }
            const sharedProps = {
              loading: false,
              onSubmitPrice: noop as any,
              onRevisePrice: noop as any,
              onStartCleaning: noop,
              onFinish: noop,
              onChat: noop,
            }
            const views: { label: string; order: Order }[] = [
              { label: 'B1 — assessment (ввод цены)',         order: { ...BASE, status: 'assessment' } },
              { label: 'B2 — price_submitted (ждём клиента)', order: { ...BASE, status: 'price_submitted', submitted_price: 480000, price_comment: 'Уборка 4 комнат, 2 санузлов, кухни и коридора' } },
              { label: 'B3 — price_rejected (отклонили)',     order: { ...BASE, status: 'price_rejected', previous_price: 480000, submitted_price: 420000, price_comment: 'Уборка 4 комнат, 2 санузлов' } },
              { label: 'B4 — team_formation (формируем)',     order: { ...BASE, status: 'team_formation', submitted_price: 450000, foreman_total: 180000 } },
              { label: 'B5 — in_progress (убирают)',          order: { ...BASE, status: 'in_progress', submitted_price: 450000 } },
              { label: 'B6 — awaiting_confirmation (ждём)',   order: { ...BASE, status: 'awaiting_confirmation', submitted_price: 450000 } },
            ]
            const components = [B1_Assessment, B2_PriceSubmitted, B3_PriceRejected, B4_TeamFormation, B5_InProgress, B6_Awaiting]
            return (
              <div class="flex flex-col gap-8">
                {views.map((v, i) => {
                  const Comp = components[i]
                  return (
                    <div key={v.label}>
                      <p class="text-[10px] text-gray-400 mb-3">{v.label}</p>
                      <div class="flex flex-col gap-3">
                        <Comp {...sharedProps} order={v.order} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })()}
        </Section>

        <Divider />

        {/* ── BRIGADIER: ORDER CARD ── */}
        <Section title="Brigadier · Карточка заказа (дом)">
          {(() => {
            const STATUSES: { key: string; label: string; sub: string }[] = [
              { key: 'assigned',              label: 'Назначен',              sub: 'Выедьте к объекту'            },
              { key: 'on_the_way',            label: 'В пути',                sub: 'Едете к клиенту'             },
              { key: 'arrived',               label: 'На объекте',            sub: 'Начните уборку'              },
              { key: 'in_progress',           label: 'Уборка идёт',           sub: 'Завершите и сдайте клиенту'  },
              { key: 'awaiting_confirmation', label: 'Ждём подтверждения',    sub: 'Клиент принимает работу'     },
            ]
            const STATUS_COLORS: Record<string, string> = {
              assigned:              '#3B82F6',
              on_the_way:            '#8B5CF6',
              arrived:               '#D97706',
              in_progress:           '#44973A',
              awaiting_confirmation: '#059669',
            }
            return (
              <div class="flex flex-col gap-4">
                {STATUSES.map(s => (
                  <div key={s.key}>
                    <p class="text-[10px] text-gray-400 mb-2 capitalize">{s.key.replace(/_/g,' ')}</p>
                    <BrigadeOrderCard
                      status={s.key}
                      statusLabel={s.label}
                      statusSub={s.sub}
                      statusColor={STATUS_COLORS[s.key]}
                      address="Юнусабад, 19-квартал, д. 8"
                      date="25 мая, 09:00–12:00"
                      rooms={4}
                      bathrooms={2}
                      price={450000}
                    />
                  </div>
                ))}
              </div>
            )
          })()}
        </Section>

        <Divider />

        {/* ── BRIGADIER: TEAM CHIPS ── */}
        <Section title="Brigadier · Команда">
          {(() => {
            const MEMBERS = [
              { name: 'Малика Юсупова',  role: 'Бригадир', online: true  },
              { name: 'Нилуфар Алиева',  role: 'Клинер',   online: true  },
              { name: 'Зарина Камолова', role: 'Клинер',   online: false },
              { name: 'Диля Рашидова',   role: 'Клинер',   online: true  },
            ]
            return (
              <div class="flex flex-col gap-4">
                <div>
                  <p class="text-[10px] text-gray-400 mb-3">Список команды</p>
                  <div class="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50 overflow-hidden">
                    {MEMBERS.map(m => (
                      <BrigadeMemberRow key={m.name} name={m.name} role={m.role} online={m.online} />
                    ))}
                  </div>
                </div>
                <div>
                  <p class="text-[10px] text-gray-400 mb-3">Чипы (горизонтально)</p>
                  <div class="flex gap-2 flex-wrap">
                    {MEMBERS.map(m => (
                      <BrigadeMemberChip key={m.name} name={m.name} role={m.role} online={m.online} />
                    ))}
                  </div>
                </div>
              </div>
            )
          })()}
        </Section>

        <Divider />

        {/* ── BRIGADIER: STATUS CTA ── */}
        <Section title="Brigadier · Кнопки действий">
          {(() => {
            const ACTIONS: { status: string; label: string; variant: 'primary' | 'ghost' | 'danger' }[] = [
              { status: 'assigned',              label: 'Выехать к клиенту',    variant: 'primary' },
              { status: 'on_the_way',            label: 'Прибыл на объект',     variant: 'primary' },
              { status: 'arrived',               label: 'Начать уборку',        variant: 'primary' },
              { status: 'in_progress',           label: 'Завершить уборку',     variant: 'ghost'   },
              { status: 'awaiting_confirmation', label: 'Ожидаем клиента...',   variant: 'ghost'   },
            ]
            return (
              <div class="flex flex-col gap-3">
                {ACTIONS.map(a => (
                  <div key={a.status}>
                    <p class="text-[10px] text-gray-400 mb-2 capitalize">{a.status.replace(/_/g,' ')}</p>
                    <StatusCTABtn
                      label={a.label}
                      variant={a.variant}
                      disabled={a.status === 'awaiting_confirmation'}
                    />
                  </div>
                ))}
                <div>
                  <p class="text-[10px] text-gray-400 mb-2">Loading</p>
                  <StatusCTABtn label="Выехать к клиенту" variant="primary" loading />
                </div>
              </div>
            )
          })()}
        </Section>

      </div>
    </div>
  )
}

// ─── Brigadier Components ─────────────────────────────────────────────────────

function BrigadeOrderCard({
  status,
  statusLabel,
  statusSub,
  statusColor,
  address,
  date,
  rooms,
  bathrooms,
  price,
}: {
  status: string
  statusLabel: string
  statusSub: string
  statusColor: string
  address: string
  date: string
  rooms: number
  bathrooms: number
  price: number
}) {
  return (
    <div class="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
      {/* Status bar */}
      <div class="px-4 pt-4 pb-3 flex items-start gap-3" style={{ borderLeft: `3px solid ${statusColor}` }}>
        <div
          class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
          style={{ background: `${statusColor}18` }}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M2 9.5L10 2l8 7.5" stroke={statusColor} stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M4 8v9h5v-4h2v4h5V8" stroke={statusColor} stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2">
            <span
              class="text-xs font-semibold px-2 py-0.5 rounded-full"
              style={{ background: `${statusColor}18`, color: statusColor }}
            >
              {statusLabel}
            </span>
          </div>
          <p class="text-xs text-gray-400 mt-0.5">{statusSub}</p>
        </div>
        <p class="text-base font-bold text-gray-900 shrink-0">{(price / 1000).toFixed(0)}k</p>
      </div>

      {/* Divider */}
      <div class="h-px bg-gray-100 mx-4" />

      {/* Details */}
      <div class="px-4 py-3 flex flex-col gap-2">
        <div class="flex items-start gap-2">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" class="mt-0.5 shrink-0 text-gray-400">
            <path d="M7 1.5A4.5 4.5 0 0 1 11.5 6c0 3-4.5 7-4.5 7S2.5 9 2.5 6A4.5 4.5 0 0 1 7 1.5Z" stroke="currentColor" stroke-width="1.3"/>
            <circle cx="7" cy="6" r="1.5" stroke="currentColor" stroke-width="1.3"/>
          </svg>
          <p class="text-sm text-gray-800 leading-snug">{address}</p>
        </div>
        <div class="flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" class="shrink-0 text-gray-400">
            <rect x="1.5" y="2.5" width="11" height="10" rx="1.5" stroke="currentColor" stroke-width="1.3"/>
            <path d="M1.5 5.5h11" stroke="currentColor" stroke-width="1.3"/>
            <path d="M4.5 1v3M9.5 1v3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
          </svg>
          <p class="text-xs text-gray-500">{date}</p>
        </div>
        <div class="flex items-center gap-3 mt-1">
          <span class="text-xs text-gray-500 flex items-center gap-1">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><rect x="1" y="1" width="10" height="10" rx="1" stroke="currentColor" stroke-width="1.2"/><path d="M4 1v10M8 1v10M1 5h10M1 8h10" stroke="currentColor" stroke-width="1" stroke-dasharray="1.5 1.5"/></svg>
            {rooms} комн.
          </span>
          <span class="text-gray-200">·</span>
          <span class="text-xs text-gray-500 flex items-center gap-1">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 7h8M2 7V3.5C2 2.67 2.67 2 3.5 2S5 2.67 5 3.5V7" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/><path d="M2 9.5C2 10.33 2.67 11 3.5 11h5c.83 0 1.5-.67 1.5-1.5V7H2v2.5Z" stroke="currentColor" stroke-width="1.2"/></svg>
            {bathrooms} санузл.
          </span>
        </div>
      </div>
    </div>
  )
}

function BrigadeMemberRow({ name, role, online }: { name: string; role: string; online: boolean }) {
  const initials = name.split(' ').map(w => w[0]).slice(0, 2).join('')
  return (
    <div class="flex items-center gap-3 px-4 py-3">
      <div class="relative shrink-0">
        <div class="w-9 h-9 rounded-full bg-[#E0F3DC] flex items-center justify-center">
          <span class="text-xs font-semibold text-[#2D6126]">{initials}</span>
        </div>
        <span
          class="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white"
          style={{ background: online ? '#22c55e' : '#9CA3AF' }}
        />
      </div>
      <div class="flex-1 min-w-0">
        <p class="text-sm font-medium text-gray-900 truncate">{name}</p>
        <p class="text-xs text-gray-400">{role}</p>
      </div>
      {online && (
        <span class="text-[10px] text-green-600 font-medium bg-green-50 px-2 py-0.5 rounded-full">На смене</span>
      )}
    </div>
  )
}

function BrigadeMemberChip({ name, role, online }: { name: string; role: string; online: boolean }) {
  const initials = name.split(' ').map(w => w[0]).slice(0, 2).join('')
  return (
    <div class={`flex items-center gap-2 px-3 py-2 rounded-2xl border ${
      online ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-100'
    }`}>
      <div class="relative shrink-0">
        <div class="w-7 h-7 rounded-full bg-[#E0F3DC] flex items-center justify-center">
          <span class="text-[10px] font-semibold text-[#2D6126]">{initials}</span>
        </div>
        <span
          class="absolute bottom-0 right-0 w-2 h-2 rounded-full border border-white"
          style={{ background: online ? '#22c55e' : '#9CA3AF' }}
        />
      </div>
      <div class="min-w-0">
        <p class={`text-xs font-medium truncate ${online ? 'text-gray-900' : 'text-gray-400'}`}>
          {name.split(' ')[0]}
        </p>
        <p class="text-[10px] text-gray-400">{role}</p>
      </div>
    </div>
  )
}

function StatusCTABtn({
  label,
  variant,
  disabled = false,
  loading = false,
}: {
  label: string
  variant: 'primary' | 'ghost' | 'danger'
  disabled?: boolean
  loading?: boolean
}) {
  const base = 'w-full py-4 rounded-2xl font-semibold text-sm transition-all active:scale-95 flex items-center justify-center gap-2'
  const variants = {
    primary: 'bg-[#44973A] text-white disabled:bg-[#BDE5B6] disabled:text-white',
    ghost:   'border-2 border-[#44973A] text-[#44973A] disabled:opacity-40',
    danger:  'bg-red-500 text-white disabled:opacity-40',
  }
  return (
    <button type="button" disabled={disabled || loading} class={`${base} ${variants[variant]}`}>
      {loading ? <span class="opacity-70">Загрузка...</span> : label}
    </button>
  )
}

// ─── Brigadier Demo Page ──────────────────────────────────────────────────────

function PoolOrderCard({ num, address, date, slot, serviceLabel }: {
  num: number; address: string; date: string; slot: string; serviceLabel: string
}) {
  return (
    <div class="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
      <div class="px-4 pt-4 pb-3">
        <div class="flex items-start justify-between gap-2 mb-2">
          <div>
            <span class="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Дом · Заказ #{num}</span>
            <p class="text-sm font-semibold text-gray-900 mt-0.5">{address}</p>
          </div>
          <span class="shrink-0 text-[11px] bg-[#F0F9EE] text-[#44973A] font-semibold px-2.5 py-1 rounded-full">{serviceLabel}</span>
        </div>
        <div class="flex items-center gap-1.5 text-xs text-gray-500">
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none" class="text-gray-400 shrink-0">
            <rect x="1.5" y="2.5" width="11" height="10" rx="1.5" stroke="currentColor" stroke-width="1.3"/>
            <path d="M1.5 5.5h11" stroke="currentColor" stroke-width="1.3"/>
            <path d="M4.5 1v3M9.5 1v3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
          </svg>
          <span>{date} · {slot}</span>
        </div>
        <p class="text-[11px] text-gray-400 mt-1">Оценка и цена — на месте</p>
      </div>
      <div class="border-t border-gray-50 px-4 pb-4 pt-3">
        <button type="button" class="w-full py-3 rounded-xl text-sm font-semibold text-white active:scale-95 transition-all" style="background:#44973A">
          Взять заказ
        </button>
      </div>
    </div>
  )
}

function BrigadierDemoPage() {
  const NOOP = () => {}
  const BASE: Order = {
    id: 'h-demo', order_num: 42, status: 'new',
    service_type: 'standard', housing_type: 'house',
    rooms: 0, bathrooms: 0, price: 320000,
    address: 'Юнусабад, 19-квартал, д. 8',
    order_date: '2026-05-26', order_slot: '09:00–12:00',
    addons: [], created_at: '2026-05-26T07:00:00Z',
    foreman_name: 'Малика Юсупова', foreman_rating: 4.8,
    submitted_price: 450000,
    price_comment: 'Уборка 4 комнат, 2 санузлов, кухни и коридора. Химчистка дивана включена.',
    team_members: [
      { executor_id: 'f1', name: 'Малика Юсупова', role: 'foreman' },
      { executor_id: 'c1', name: 'Нилуфар Алиева', role: 'cleaner' },
      { executor_id: 'c2', name: 'Зарина Камолова', role: 'cleaner' },
    ],
  }

  const views: { label: string; desc: string; node: preact.ComponentChildren }[] = [
    {
      label: 'A1 · new — Ищем бригадира',
      desc: 'Заказ создан, бригадир ещё не взял его из пула',
      node: <ViewA1 order={{ ...BASE, status: 'new' }} onCancel={NOOP} loading={false} />,
    },
    {
      label: 'A2 · assessment — Бригадир едет',
      desc: 'Бригадир взял заказ и выехал на объект для оценки',
      node: <ViewA2 order={{ ...BASE, status: 'assessment' }} onChat={NOOP} onCancel={NOOP} loading={false} />,
    },
    {
      label: 'A3 · price_submitted — Бригадир назвал цену',
      desc: 'Клиент видит предложение и может принять, отклонить или предложить свою цену',
      node: <ViewA3 order={{ ...BASE, status: 'price_submitted' }} onConfirm={NOOP} onReject={NOOP} onCounter={NOOP} onCancel={NOOP} loading={false} />,
    },
    {
      label: 'A3b · price_submitted — Пересмотренная цена',
      desc: 'Бригадир пересмотрел цену после отказа — клиент видит "было / стало"',
      node: <ViewA3 order={{ ...BASE, status: 'price_submitted', previous_price: 320000 }} onConfirm={NOOP} onReject={NOOP} onCounter={NOOP} onCancel={NOOP} loading={false} />,
    },
    {
      label: 'A4 · price_rejected — Ждём новой цены',
      desc: 'Клиент отклонил цену, бригадир готовит новое предложение',
      node: <ViewA4 order={{ ...BASE, status: 'price_rejected', previous_price: 450000 }} onCancel={NOOP} loading={false} />,
    },
    {
      label: 'A5 · team_formation — Команда формируется',
      desc: 'Клиент согласился с ценой, бригадир набирает команду',
      node: <ViewA5 order={{ ...BASE, status: 'team_formation' }} onCancel={NOOP} loading={false} />,
    },
    {
      label: 'A6 · in_progress — Уборка идёт',
      desc: 'Команда работает на объекте',
      node: <ViewA6 order={{ ...BASE, status: 'in_progress' }} onChat={NOOP} />,
    },
    {
      label: 'A7 · awaiting_confirmation — Принять работу',
      desc: 'Уборка завершена, клиент подтверждает или открывает спор',
      node: <ViewA7 order={{ ...BASE, status: 'awaiting_confirmation' }} onAccept={NOOP} loading={false} onChat={NOOP} />,
    },
  ]

  return (
    <div class="pt-6 max-w-[600px] mx-auto">
      <div class="px-4 mb-6">
        <p class="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-1">House Order Flow</p>
        <h2 class="text-base font-bold text-gray-900">Что видит клиент</h2>
        <p class="text-xs text-gray-400 mt-1">8 состояний от создания заказа до подтверждения завершения</p>
      </div>

      {views.map((v, i) => (
        <div key={v.label}>
          {i > 0 && <Divider />}
          <Section title={v.label}>
            <p class="text-xs text-gray-400 mb-3">{v.desc}</p>
            <div class="flex flex-col gap-2">
              {v.node}
            </div>
          </Section>
        </div>
      ))}

      <div class="h-10" />
    </div>
  )
}

// ─── Handyman Demo Page ───────────────────────────────────────────────────────

function HandymanDemoPage() {
  const MOCK_ADDONS = [
    { id: 'plumbing',   translations: { ru: 'Сантехника'     }, price: 30000 },
    { id: 'electrical', translations: { ru: 'Электрика'      }, price: 40000 },
    { id: 'furniture',  translations: { ru: 'Сборка мебели'  }, price: 50000 },
    { id: 'painting',   translations: { ru: 'Покраска'        }, price: 60000 },
  ]
  const MOCK_ADDRESSES = [
    { id: 'a1', address: 'Карасу-2, д. 39',              label: 'Дом',    housing_type: 'apt'   as const },
    { id: 'a2', address: 'ул. Насирходжа, 72',           label: 'Работа', housing_type: 'apt'   as const },
    { id: 'a3', address: 'Юнусабад, 19-квартал, д. 8',  label: null,     housing_type: 'house' as const },
  ]

  const [addrOpen,    setAddrOpen]    = useState(false)
  const [selectedAddr, setSelectedAddr] = useState<typeof MOCK_ADDRESSES[0] | null>(null)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
  const [selectedAddons, setSelectedAddons] = useState<string[]>([])
  const [comment,    setComment]    = useState('')

  const SLOTS = ['09:00–12:00', '12:00–15:00', '15:00–18:00']
  const BASE_PRICE = 50000
  const price = BASE_PRICE + MOCK_ADDONS.filter(a => selectedAddons.includes(a.id)).reduce((s, a) => s + a.price, 0)
  const canSubmit = !!selectedAddr && !!selectedDate && !!selectedSlot

  function toggleAddon(id: string) {
    setSelectedAddons(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  return (
    <div class="pt-6 max-w-[600px] mx-auto">

      {/* ── Intro ── */}
      <div class="px-4 mb-6">
        <p class="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-1">Handyman Order</p>
        <h2 class="text-base font-bold text-gray-900">Экран заказа мастера</h2>
        <p class="text-xs text-gray-400 mt-1">Интерактивное демо всех состояний формы</p>
      </div>

      {/* ── Address dropdown ── */}
      <Section title="1 · Адрес — дропдаун">
        <div class="flex flex-col gap-4">
          <div>
            <p class="text-[10px] text-gray-400 mb-2">Пустой</p>
            <div class="flex items-center justify-between px-4 py-3.5 rounded-2xl border-2 border-gray-200 bg-white">
              <p class="text-sm text-gray-400">Адрес</p>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" class="text-gray-400">
                <path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
          </div>

          <div>
            <p class="text-[10px] text-gray-400 mb-2">Выбран</p>
            <div class="flex items-center justify-between px-4 py-3.5 rounded-2xl border-2 border-[#44973A] bg-[#F0F9EE]">
              <div>
                <p class="text-sm font-medium text-[#44973A]">Карасу-2, д. 39</p>
                <p class="text-xs text-gray-400 mt-0.5">кв. 12, домофон 42</p>
              </div>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" class="text-gray-400">
                <path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
          </div>

          <div>
            <p class="text-[10px] text-gray-400 mb-2">Открытый (интерактивный)</p>
            <div class="relative">
              <button
                type="button"
                onClick={() => setAddrOpen(v => !v)}
                class={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl border-2 bg-white text-left transition-colors ${addrOpen ? 'border-[#44973A]' : selectedAddr ? 'border-[#44973A] bg-[#F0F9EE]' : 'border-gray-200'}`}
              >
                {selectedAddr ? (
                  <p class="text-sm font-medium text-[#44973A] truncate">{selectedAddr.address}</p>
                ) : (
                  <p class="text-sm text-gray-400">Адрес</p>
                )}
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" class={`shrink-0 ml-2 text-gray-400 transition-transform ${addrOpen ? 'rotate-180' : ''}`}>
                  <path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </button>
              {addrOpen && (
                <>
                  <div class="fixed inset-0 z-10" onClick={() => setAddrOpen(false)} />
                  <div class="absolute left-0 right-0 top-[calc(100%+6px)] z-20 bg-white rounded-2xl border border-gray-100 shadow-lg overflow-hidden">
                    {MOCK_ADDRESSES.map(addr => (
                      <AddressOption
                        key={addr.id}
                        address={addr.address}
                        label={addr.label}
                        housingType={addr.housing_type}
                        active={selectedAddr?.id === addr.id}
                        onClick={() => { setSelectedAddr(addr); setAddrOpen(false) }}
                      />
                    ))}
                    <button
                      type="button"
                      onClick={() => setAddrOpen(false)}
                      class="w-full flex items-center gap-3 px-4 py-3 text-left active:bg-gray-50 transition-colors border-t border-gray-100"
                    >
                      <div class="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center shrink-0 text-gray-500 text-sm font-light">+</div>
                      <p class="text-sm font-medium text-gray-500">Добавить новый адрес</p>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </Section>

      <Divider />

      {/* ── Date chips ── */}
      <Section title="2 · Дата и слот — чипы">
        <div class="flex flex-col gap-4">
          <div>
            <p class="text-[10px] text-gray-400 mb-2">Ничего не выбрано</p>
            <div class="flex gap-2">
              {['Сегодня', 'Завтра', 'Другой день'].map(d => (
                <button key={d} type="button" class="px-4 py-2 rounded-full text-sm font-medium bg-gray-100 text-gray-700">
                  {d}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p class="text-[10px] text-gray-400 mb-2">Интерактивно — выберите дату и слот</p>
            <div class="flex gap-2 mb-3">
              {[{ iso: '2026-05-31', label: 'Сегодня' }, { iso: '2026-06-01', label: 'Завтра' }, { iso: '2026-06-05', label: '5 июн' }].map(d => (
                <button
                  key={d.iso}
                  type="button"
                  onClick={() => { setSelectedDate(d.iso); setSelectedSlot(null) }}
                  class={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${selectedDate === d.iso ? 'bg-[#44973A] text-white' : 'bg-gray-100 text-gray-700'}`}
                >
                  {d.label}
                </button>
              ))}
            </div>
            {selectedDate && (
              <div class="flex gap-2 flex-wrap">
                {SLOTS.map(slot => (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => setSelectedSlot(slot)}
                    class={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${selectedSlot === slot ? 'bg-[#44973A] text-white' : 'bg-gray-100 text-gray-700'}`}
                  >
                    {slot}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </Section>

      <Divider />

      {/* ── Addons ── */}
      <Section title="3 · Дополнения — чекбоксы">
        <div class="flex flex-col gap-4">
          <div>
            <p class="text-[10px] text-gray-400 mb-2">Ничего не выбрано</p>
            <div class="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
              {MOCK_ADDONS.map(addon => (
                <div key={addon.id} class="flex items-center justify-between px-4 py-3.5">
                  <span class="text-sm font-medium text-gray-900">{addon.translations['ru'] ?? addon.id}</span>
                  <div class="flex items-center gap-3">
                    <span class="text-xs text-gray-400">+{addon.price.toLocaleString('ru-RU')}</span>
                    <div class="w-5 h-5 rounded-md border-2 border-gray-300" />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <p class="text-[10px] text-gray-400 mb-2">Интерактивный (кликайте)</p>
            <div class="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
              {MOCK_ADDONS.map(addon => {
                const on = selectedAddons.includes(addon.id)
                return (
                  <button
                    key={addon.id}
                    type="button"
                    onClick={() => toggleAddon(addon.id)}
                    class="w-full flex items-center justify-between px-4 py-3.5 transition-colors active:bg-gray-50 text-left"
                  >
                    <span class={`text-sm font-medium ${on ? 'text-[#2D6126]' : 'text-gray-900'}`}>{addon.translations['ru'] ?? addon.id}</span>
                    <div class="flex items-center gap-3">
                      <span class="text-xs text-gray-400">+{addon.price.toLocaleString('ru-RU')}</span>
                      <div class={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${on ? 'bg-[#44973A] border-[#44973A]' : 'border-gray-300'}`}>
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
            {selectedAddons.length > 0 && (
              <p class="text-xs text-gray-400 mt-2">Выбрано: {selectedAddons.join(', ')}</p>
            )}
          </div>
        </div>
      </Section>

      <Divider />

      {/* ── Comment ── */}
      <Section title="4 · Комментарий — textarea">
        <div class="flex flex-col gap-4">
          <div>
            <p class="text-[10px] text-gray-400 mb-2">Пустой</p>
            <textarea
              rows={3}
              placeholder="Опишите задачу подробнее..."
              disabled
              class="w-full bg-white border border-gray-200 rounded-2xl px-4 py-3 text-sm text-gray-400 placeholder-gray-400 resize-none"
            />
          </div>
          <div>
            <p class="text-[10px] text-gray-400 mb-2">Интерактивный</p>
            <textarea
              rows={3}
              placeholder="Опишите задачу подробнее..."
              value={comment}
              onInput={e => setComment((e.target as HTMLTextAreaElement).value)}
              class="w-full bg-white border border-gray-200 rounded-2xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#44973A] transition-colors resize-none"
            />
          </div>
        </div>
      </Section>

      <Divider />

      {/* ── Submit CTA ── */}
      <Section title="5 · Кнопка отправки — состояния">
        <div class="flex flex-col gap-3">
          <div>
            <p class="text-[10px] text-gray-400 mb-2">Disabled (адрес / дата не выбраны)</p>
            <button type="button" disabled class="w-full py-4 rounded-2xl text-sm font-semibold text-white opacity-40" style="background:#44973A">
              Оставить заявку · 50 000 сум
            </button>
          </div>
          <div>
            <p class="text-[10px] text-gray-400 mb-2">Active</p>
            <button type="button" class="w-full py-4 rounded-2xl text-sm font-semibold text-white transition-colors" style="background:#44973A">
              Оставить заявку · 50 000 сум
            </button>
          </div>
          <div>
            <p class="text-[10px] text-gray-400 mb-2">Loading</p>
            <button type="button" disabled class="w-full py-4 rounded-2xl text-sm font-semibold text-white opacity-70" style="background:#44973A">
              Отправляем...
            </button>
          </div>
          <div>
            <p class="text-[10px] text-gray-400 mb-2">С аддонами (интерактивно — выберите выше)</p>
            <button
              type="button"
              disabled={!canSubmit}
              class={`w-full py-4 rounded-2xl text-sm font-semibold text-white transition-colors ${!canSubmit ? 'opacity-40' : ''}`}
              style="background:#44973A"
            >
              {`Оставить заявку · ${price.toLocaleString('ru-RU')} сум`}
            </button>
            {!canSubmit && (
              <p class="text-[10px] text-gray-400 mt-2 text-center">Выберите адрес + дату + слот выше</p>
            )}
          </div>
        </div>
      </Section>

      <Divider />

      {/* ── Done screen ── */}
      <Section title="6 · Экран успеха">
        <div class="bg-gray-50 rounded-2xl p-6 flex flex-col items-center text-center gap-5">
          <div class="w-16 h-16 rounded-full bg-[#F0F9EE] flex items-center justify-center">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <path d="M5 14l7 7 11-12" stroke="#44973A" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </div>
          <div>
            <h2 class="text-lg font-bold text-gray-900 mb-1">Заявка принята!</h2>
            <p class="text-sm text-gray-400">Мастер свяжется с вами в ближайшее время</p>
          </div>
          <button type="button" class="w-full max-w-xs py-4 rounded-2xl text-sm font-semibold text-white" style="background:#44973A">
            На главную
          </button>
        </div>
      </Section>

      <Divider />

      {/* ── Active Order Banners ── */}
      {(() => {
        const BASE_ORDER: Order = {
          id: 'demo', order_num: 42, status: 'new',
          service_type: 'standard', housing_type: 'apt',
          rooms: 2, bathrooms: 1, price: 280000,
          address: 'Карасу-2, д. 39', order_date: '2026-05-31',
          order_slot: '12:00–15:00', addons: [], created_at: '',
        }
        const statuses = Object.entries(ACTIVE_ORDER_STATUS_LABEL) as [string, string][]
        return (
          <Section title="7 · Баннер активного заказа — все статусы">
            <div class="flex flex-col gap-3">
              {statuses.map(([status, label]) => (
                <div key={status}>
                  <p class="text-[10px] text-gray-400 mb-1.5 font-mono">{status} — {label}</p>
                  <ActiveOrderBanner
                    order={{ ...BASE_ORDER, status: status as Order['status'] }}
                    onClick={() => {}}
                  />
                </div>
              ))}
            </div>
          </Section>
        )
      })()}

      <div class="h-10" />
    </div>
  )
}
