// Dev-only UI Kit. Access at ?uikit=1
import { useState } from 'preact/hooks'
import { getTheme, setTheme } from '../hooks/useTheme'
import { MapPicker } from '../components/MapPicker'

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

function AddressChip({ address, active = false }: { address: string; active?: boolean }) {
  return (
    <div class={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-colors ${
      active ? 'bg-[#E0F3DC] border border-[#44973A]/30' : 'bg-gray-100 border border-transparent'
    }`}>
      <span class="text-lg leading-none shrink-0">🏠</span>
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

  function toggleTheme() {
    const next = theme === 'light' ? 'dark' : 'light'
    setTheme(next)
    setThemeState(next)
  }

  return (
    <div class="min-h-screen bg-gray-50 pb-16">
      {/* Header */}
      <div class="bg-white border-b border-gray-100 px-4 pt-12 pb-5 sticky top-0 z-10">
        <div class="flex items-start justify-between">
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
      </div>

      <div class="pt-6 max-w-[1000px] mx-auto">

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
            <div class="flex items-center gap-3 px-4 py-3 rounded-2xl border-2 border-dashed border-gray-200">
              <span class="text-lg leading-none">+</span>
              <p class="text-sm text-gray-400">Добавить адрес</p>
            </div>
          </div>
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

      </div>
    </div>
  )
}
