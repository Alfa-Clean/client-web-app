import { useState } from 'preact/hooks'
import { MessageCircle, ChevronRight, Plus, UserCheck } from 'lucide-react'
import type { Order, TeamMember } from '../api/orders'
import { submitPrice, startCleaning, finishCleaning } from '../api/orders'
import { useLocale } from '../i18n'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { useConfirm } from '../hooks/useConfirm'
import { useExitBack } from '../hooks/useExitBack'

// ─── Design tokens ────────────────────────────────────────────────────────────

const GREEN = '#44973A'
const GREEN_BG = '#F0F9EE'
const GREEN_LIGHT = '#E0F3DC'
const GREEN_DARK = '#2D6126'

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  order: Order
  onBack: () => void
  onChatClick: () => void
  onOrderUpdated: (order: Order) => void
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export function BrigadierOrderScreen({
  order: initialOrder,
  onBack,
  onChatClick,
  onOrderUpdated,
}: Props) {
  const { t } = useLocale()
  const { exiting, handleBack } = useExitBack(onBack)
  const { confirm, dialogProps } = useConfirm()
  const [order, setOrder] = useState(initialOrder)
  const [loading, setLoading] = useState(false)

  function update(o: Order) {
    setOrder(o)
    onOrderUpdated(o)
  }

  async function handleSubmitPrice(price: number, comment: string) {
    const ok = await confirm(t('confirm_brigadier_submit_price'), { confirmVariant: 'primary' })
    if (!ok) return
    setLoading(true)
    try { update(await submitPrice(order.id, price, comment)) } catch { /* ignore */ }
    setLoading(false)
  }

  async function handleRevisePrice(price: number, comment: string) {
    setLoading(true)
    try { update(await submitPrice(order.id, price, comment)) } catch { /* ignore */ }
    setLoading(false)
  }

  async function handleStartCleaning() {
    setLoading(true)
    try { update(await startCleaning(order.id)) } catch { /* ignore */ }
    setLoading(false)
  }

  async function handleFinish() {
    const ok = await confirm(t('confirm_brigadier_finish'), { confirmVariant: 'primary' })
    if (!ok) return
    setLoading(true)
    try {
      update(await finishCleaning(order.id))
    } catch { /* ignore */ }
    setLoading(false)
  }

  return (
    <div class={`min-h-screen bg-gray-50 flex flex-col ${exiting ? 'animate-slide-out-right' : 'animate-slide-in-right'}`}>
      <ConfirmDialog
        {...dialogProps}
        confirmLabel={dialogProps.confirmLabel ?? t('dialog_ok')}
        cancelLabel={dialogProps.cancelLabel ?? t('dialog_cancel')}
      />

      {/* Header */}
      <div class="bg-white px-4 pt-12 pb-4 flex items-center border-b border-gray-100 shrink-0">
        <button
          type="button"
          onClick={handleBack}
          class="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 active:bg-gray-200 transition-colors text-gray-700 text-xl shrink-0"
        >
          ‹
        </button>
        <div class="flex-1 absolute inset-x-0 text-center pointer-events-none">
          <p class="text-base font-semibold text-gray-900">
            {t('history_order', { num: String(order.order_num) })}
          </p>
        </div>
        <div class="ml-auto">
          <button
            type="button"
            onClick={onChatClick}
            class="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 active:bg-gray-200 transition-colors"
          >
            <MessageCircle size={18} class="text-gray-500" />
          </button>
        </div>
      </div>

      <div class="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3 pb-8">
        {/* Order meta — always visible */}
        <OrderMetaCard order={order} />

        {/* Status view */}
        <StatusView
          order={order}
          loading={loading}
          onSubmitPrice={handleSubmitPrice}
          onRevisePrice={handleRevisePrice}
          onStartCleaning={handleStartCleaning}
          onFinish={handleFinish}
          onChat={onChatClick}
        />
      </div>
    </div>
  )
}

// ─── Order meta card (always shown) ──────────────────────────────────────────

function OrderMetaCard({ order }: { order: Order }) {
  const { t } = useLocale()
  return (
    <div class="bg-white rounded-2xl border border-gray-100 px-4 py-3.5 flex flex-col gap-2">
      <div class="flex items-start gap-2">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" class="mt-0.5 shrink-0 text-gray-400">
          <path d="M7 1.5A4.5 4.5 0 0 1 11.5 6c0 3-4.5 7-4.5 7S2.5 9 2.5 6A4.5 4.5 0 0 1 7 1.5Z" stroke="currentColor" stroke-width="1.3"/>
          <circle cx="7" cy="6" r="1.5" stroke="currentColor" stroke-width="1.3"/>
        </svg>
        <p class="text-sm font-medium text-gray-800 leading-snug">{order.address}</p>
      </div>
      <div class="flex items-center gap-3">
        <div class="flex items-center gap-1.5">
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none" class="text-gray-400">
            <rect x="1.5" y="2.5" width="11" height="10" rx="1.5" stroke="currentColor" stroke-width="1.3"/>
            <path d="M1.5 5.5h11" stroke="currentColor" stroke-width="1.3"/>
            <path d="M4.5 1v3M9.5 1v3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
          </svg>
          <span class="text-xs text-gray-500">{order.order_date ? new Date(order.order_date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }) : '—'}{order.order_slot ? `, ${order.order_slot}` : ''}</span>
        </div>
        <span class="text-gray-200">·</span>
        <span class="text-xs text-gray-500">
          {t('brigadier_order_meta', { rooms: String(order.rooms), bath: String(order.bathrooms) })}
        </span>
      </div>
      {order.comment && (
        <p class="text-xs text-gray-400 italic">«{order.comment}»</p>
      )}
    </div>
  )
}

// ─── Status view switcher ─────────────────────────────────────────────────────

interface StatusViewProps {
  order: Order
  loading: boolean
  onSubmitPrice: (price: number, comment: string) => void
  onRevisePrice: (price: number, comment: string) => void
  onStartCleaning: () => void
  onFinish: () => void
  onChat: () => void
}

function StatusView(props: StatusViewProps) {
  const { order } = props
  switch (order.status) {
    case 'assessment':      return <B1_Assessment    {...props} />
    case 'price_submitted': return <B2_PriceSubmitted {...props} />
    case 'price_rejected':  return <B3_PriceRejected  {...props} />
    case 'team_formation':  return <B4_TeamFormation  {...props} />
    case 'in_progress':     return <B5_InProgress     {...props} />
    case 'awaiting_confirmation': return <B6_Awaiting {...props} />
    default: return null
  }
}

// ─── B1 — Оценка объекта (assessment) ────────────────────────────────────────

function B1_Assessment({ order, loading, onSubmitPrice }: StatusViewProps) {
  const { t } = useLocale()
  const [price, setPrice] = useState(order.submitted_price ? String(order.submitted_price) : '')
  const [scope, setScope] = useState(order.price_comment ?? '')
  const canSubmit = price.length > 0 && Number(price) > 0

  return (
    <>
      <div class="bg-white rounded-2xl border border-gray-100 px-4 py-4 flex flex-col gap-4">
        <p class="text-xs text-gray-400">{t('brigadier_assessment_hint')}</p>

        {/* Price input */}
        <div class="flex flex-col gap-1.5">
          <label class="text-xs font-medium text-gray-600">{t('brigadier_price_label')}</label>
          <div class="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 focus-within:border-[#44973A] transition-colors">
            <input
              type="number"
              inputMode="numeric"
              value={price}
              onInput={e => setPrice((e.target as HTMLInputElement).value)}
              placeholder={t('brigadier_price_placeholder')}
              class="flex-1 bg-transparent outline-none text-base font-semibold text-gray-900 placeholder-gray-300"
            />
            <span class="text-sm text-gray-400 shrink-0">{t('currency')}</span>
          </div>
        </div>

        {/* Scope textarea */}
        <div class="flex flex-col gap-1.5">
          <label class="text-xs font-medium text-gray-600">{t('brigadier_scope_label')}</label>
          <textarea
            value={scope}
            onInput={e => setScope((e.target as HTMLTextAreaElement).value)}
            placeholder={t('brigadier_scope_placeholder')}
            rows={3}
            class="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-sm text-gray-900 placeholder-gray-300 outline-none resize-none focus:border-[#44973A] transition-colors"
          />
        </div>
      </div>

      <button
        type="button"
        disabled={!canSubmit || loading}
        onClick={() => onSubmitPrice(Number(price), scope)}
        class="w-full py-4 rounded-2xl font-semibold text-sm text-white transition-all active:scale-95 disabled:opacity-40"
        style={{ background: GREEN }}
      >
        {loading ? t('btn_loading') : t('brigadier_submit_price')}
      </button>
    </>
  )
}

// ─── B2 — Ожидание ответа клиента (price_submitted) ──────────────────────────

function B2_PriceSubmitted({ order, onChat }: StatusViewProps) {
  const { t } = useLocale()
  const displayPrice = order.submitted_price ?? order.price

  return (
    <>
      <div class="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {/* Status strip */}
        <div class="px-4 py-3 flex items-center gap-3" style={{ background: GREEN_BG }}>
          <PulsingDot color={GREEN} />
          <div class="flex-1 min-w-0">
            <p class="text-sm font-semibold" style={{ color: GREEN }}>{t('brigadier_waiting_client')}</p>
            <p class="text-xs text-gray-500 mt-0.5">{t('brigadier_waiting_client_hint')}</p>
          </div>
        </div>

        {/* Price block */}
        <div class="px-4 py-4 flex flex-col gap-2">
          <p class="text-xs text-gray-400">{t('brigadier_submitted_price')}</p>
          <p class="text-2xl font-bold text-gray-900">
            {displayPrice.toLocaleString()} <span class="text-base font-normal text-gray-400">{t('currency')}</span>
          </p>
          {order.price_comment && (
            <p class="text-sm text-gray-500 leading-relaxed">{order.price_comment}</p>
          )}
        </div>
      </div>

      <ChatBtn onChat={onChat} label={t('house_btn_write_foreman')} />
    </>
  )
}

// ─── B3 — Цена отклонена (price_rejected) ────────────────────────────────────

function B3_PriceRejected({ order, loading, onRevisePrice, onChat }: StatusViewProps) {
  const { t } = useLocale()
  const [price, setPrice] = useState(String(order.submitted_price ?? ''))
  const [scope, setScope] = useState(order.price_comment ?? '')
  const canSubmit = price.length > 0 && Number(price) > 0

  return (
    <>
      <div class="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {/* Rejected strip */}
        <div class="px-4 py-3 flex items-center gap-3 bg-red-50">
          <div class="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center shrink-0">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M4 4l8 8M12 4l-8 8" stroke="#EF4444" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
          </div>
          <p class="text-sm font-semibold text-red-600">{t('brigadier_price_rejected_title')}</p>
        </div>

        {/* Previous price struck + client counter */}
        <div class="px-4 py-4 flex flex-col gap-3">
          {order.previous_price && (
            <div class="flex items-center gap-2">
              <p class="text-xs text-gray-400">{t('brigadier_submitted_price')}</p>
              <p class="text-sm text-gray-400 line-through">{order.previous_price.toLocaleString()} {t('currency')}</p>
            </div>
          )}
          {order.submitted_price && order.previous_price && order.submitted_price !== order.previous_price && (
            <div class="bg-amber-50 rounded-xl px-3 py-2.5">
              <p class="text-xs text-amber-600 mb-1">{t('brigadier_client_counter')}</p>
              <p class="text-base font-bold text-amber-700">
                {order.submitted_price.toLocaleString()} {t('currency')}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* New price form */}
      <div class="bg-white rounded-2xl border border-gray-100 px-4 py-4 flex flex-col gap-3">
        <div class="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 focus-within:border-[#44973A] transition-colors">
          <input
            type="number"
            inputMode="numeric"
            value={price}
            onInput={e => setPrice((e.target as HTMLInputElement).value)}
            placeholder={t('brigadier_price_placeholder')}
            class="flex-1 bg-transparent outline-none text-base font-semibold text-gray-900 placeholder-gray-300"
          />
          <span class="text-sm text-gray-400 shrink-0">{t('currency')}</span>
        </div>
        <textarea
          value={scope}
          onInput={e => setScope((e.target as HTMLTextAreaElement).value)}
          placeholder={t('brigadier_scope_placeholder')}
          rows={2}
          class="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-sm text-gray-900 placeholder-gray-300 outline-none resize-none focus:border-[#44973A] transition-colors"
        />
      </div>

      <div class="flex flex-col gap-2">
        <button
          type="button"
          disabled={!canSubmit || loading}
          onClick={() => onRevisePrice(Number(price), scope)}
          class="w-full py-4 rounded-2xl font-semibold text-sm text-white transition-all active:scale-95 disabled:opacity-40"
          style={{ background: GREEN }}
        >
          {loading ? t('btn_loading') : t('brigadier_revise_price_btn')}
        </button>
        <ChatBtn onChat={onChat} label={t('house_btn_write_foreman')} />
      </div>
    </>
  )
}

// ─── B4 — Формирование команды (team_formation) ───────────────────────────────

function B4_TeamFormation({ order, loading, onStartCleaning }: StatusViewProps) {
  const { t } = useLocale()
  const confirmedPrice = order.submitted_price ?? order.price
  const members = order.team_members ?? []

  return (
    <>
      {/* Confirmed price */}
      <div class="bg-white rounded-2xl border border-gray-100 px-4 py-3.5 flex items-center justify-between">
        <div>
          <p class="text-xs text-gray-400">{t('brigadier_confirmed_price_label')}</p>
          <p class="text-xl font-bold text-gray-900 mt-0.5">
            {confirmedPrice.toLocaleString()} <span class="text-sm font-normal text-gray-400">{t('currency')}</span>
          </p>
        </div>
        {order.foreman_total != null && (
          <div class="text-right">
            <p class="text-xs text-gray-400">{t('brigadier_your_take')}</p>
            <p class="text-base font-bold" style={{ color: GREEN }}>
              {order.foreman_total.toLocaleString()} {t('currency')}
            </p>
          </div>
        )}
      </div>

      {/* Team */}
      <div class="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div class="px-4 py-3 border-b border-gray-50">
          <p class="text-xs font-semibold text-gray-500">{t('brigadier_team_title')}</p>
          <p class="text-xs text-gray-400 mt-0.5">{t('brigadier_team_hint')}</p>
        </div>

        {/* Foreman row (self) */}
        <MemberRow name={order.foreman_name ?? '—'} role="foreman" />

        {/* Assigned cleaners */}
        {members.filter(m => m.role !== 'foreman').map(m => (
          <MemberRow key={m.executor_id} name={m.name} role={m.role} />
        ))}

        {/* Add member */}
        <button
          type="button"
          class="w-full flex items-center gap-3 px-4 py-3 active:bg-gray-50 transition-colors border-t border-gray-50"
        >
          <div class="w-9 h-9 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center shrink-0">
            <Plus size={14} class="text-gray-400" />
          </div>
          <p class="text-sm text-gray-400">{t('brigadier_add_member')}</p>
        </button>
      </div>

      <button
        type="button"
        disabled={loading}
        onClick={onStartCleaning}
        class="w-full py-4 rounded-2xl font-semibold text-sm text-white transition-all active:scale-95 disabled:opacity-40"
        style={{ background: GREEN }}
      >
        {loading ? t('btn_loading') : t('brigadier_start_cleaning_btn')}
      </button>
    </>
  )
}

// ─── B5 — Уборка идёт (in_progress) ──────────────────────────────────────────

function B5_InProgress({ order, loading, onFinish, onChat }: StatusViewProps) {
  const { t } = useLocale()
  const members = order.team_members ?? []

  return (
    <>
      {/* Status hero */}
      <div class="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div class="px-4 py-4" style={{ background: GREEN }}>
          <p class="text-white font-bold text-lg mb-3">{t('brigadier_in_progress_title')}</p>
          {members.length > 0 && <TeamAvatarRow members={members} />}
        </div>
        <div class="px-4 py-3 flex items-center justify-between">
          <span class="text-xs text-gray-500">
            {t('brigadier_order_meta', { rooms: String(order.rooms), bath: String(order.bathrooms) })}
          </span>
          <span class="text-sm font-semibold text-gray-900">
            {(order.submitted_price ?? order.price).toLocaleString()} {t('currency')}
          </span>
        </div>
      </div>

      <div class="flex flex-col gap-2">
        <button
          type="button"
          disabled={loading}
          onClick={onFinish}
          class="w-full py-4 rounded-2xl font-semibold text-sm transition-all active:scale-95 disabled:opacity-40 border-2"
          style={{ borderColor: GREEN, color: GREEN }}
        >
          {loading ? t('btn_loading') : t('brigadier_finish_btn')}
        </button>
        <ChatBtn onChat={onChat} label={t('house_btn_write_foreman')} />
      </div>
    </>
  )
}

// ─── B6 — Ожидание подтверждения клиента (awaiting_confirmation) ──────────────

function B6_Awaiting({ order, onChat }: StatusViewProps) {
  const { t } = useLocale()
  const members = order.team_members ?? []

  return (
    <>
      <div class="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {/* Done hero */}
        <div class="px-4 pt-6 pb-4 flex flex-col items-center gap-3">
          <div
            class="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{ background: GREEN_LIGHT }}
          >
            <UserCheck size={28} style={{ color: GREEN }} />
          </div>
          <p class="text-base font-bold text-gray-900">{t('brigadier_awaiting_title')}</p>
          <p class="text-sm text-gray-400 text-center">{t('brigadier_awaiting_hint')}</p>
          <p class="text-2xl font-bold" style={{ color: GREEN }}>
            {(order.submitted_price ?? order.price).toLocaleString()} {t('currency')}
          </p>
        </div>

        {/* Team */}
        {members.length > 0 && (
          <div class="px-4 pb-4">
            <div class="flex items-center justify-center gap-3">
              <TeamAvatarRow members={members} />
            </div>
          </div>
        )}
      </div>

      <ChatBtn onChat={onChat} label={t('house_btn_write_foreman')} />
    </>
  )
}

// ─── Shared sub-components ────────────────────────────────────────────────────

function MemberRow({ name, role }: { name: string; role: string }) {
  const { t } = useLocale()
  const initials = name.split(' ').map(w => w[0]).slice(0, 2).join('')
  const isForeman = role === 'foreman'
  return (
    <div class="flex items-center gap-3 px-4 py-3">
      <div class="relative shrink-0">
        <div
          class="w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: isForeman ? GREEN : GREEN_LIGHT }}
        >
          <span class="text-xs font-semibold" style={{ color: isForeman ? 'white' : GREEN_DARK }}>
            {initials || '?'}
          </span>
        </div>
        {isForeman && (
          <span class="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-amber-400 rounded-full border-2 border-white flex items-center justify-center text-[8px]">★</span>
        )}
      </div>
      <div class="flex-1 min-w-0">
        <p class="text-sm font-medium text-gray-900 truncate">{name}</p>
        <p class="text-xs text-gray-400">{isForeman ? t('house_foreman_badge') : 'Клинер'}</p>
      </div>
      <ChevronRight size={14} class="text-gray-300 shrink-0" />
    </div>
  )
}

function TeamAvatarRow({ members }: { members: TeamMember[] }) {
  return (
    <div class="flex items-center gap-2 flex-wrap">
      {members.map(m => {
        const initials = m.name.split(' ').map(w => w[0]).slice(0, 2).join('')
        const isForeman = m.role === 'foreman'
        return (
          <div key={m.executor_id} class="flex flex-col items-center gap-1">
            <div class="relative">
              <div
                class="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold"
                style={{ background: isForeman ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.15)', color: 'white' }}
              >
                {initials}
              </div>
              {isForeman && (
                <span class="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-amber-400 rounded-full border-2 border-white flex items-center justify-center text-[8px]">★</span>
              )}
            </div>
            <p class="text-[10px] text-white/70 truncate max-w-[44px] text-center">{m.name.split(' ')[0]}</p>
          </div>
        )
      })}
    </div>
  )
}

function PulsingDot({ color = GREEN }: { color?: string }) {
  return (
    <div class="relative w-8 h-8 flex items-center justify-center shrink-0">
      <span
        class="absolute inset-0 rounded-full animate-ping"
        style={{ background: `${color}30`, animationDuration: '1.5s' }}
      />
      <span class="w-3 h-3 rounded-full" style={{ background: color }} />
    </div>
  )
}

function ChatBtn({ onChat, label }: { onChat: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onChat}
      class="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-semibold transition-all active:scale-95 border border-gray-200 text-gray-600 active:bg-gray-50"
    >
      <MessageCircle size={16} />
      {label}
    </button>
  )
}

// ─── Exported for UIKit ───────────────────────────────────────────────────────

export { B1_Assessment, B2_PriceSubmitted, B3_PriceRejected, B4_TeamFormation, B5_InProgress, B6_Awaiting }
export { MemberRow, PulsingDot, OrderMetaCard }
