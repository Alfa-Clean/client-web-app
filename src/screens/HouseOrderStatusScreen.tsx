import { useState } from 'preact/hooks'
import { MessageCircle, X } from 'lucide-react'
import type { Order } from '../api/orders'
import { confirmPrice, rejectPrice, cancelOrder, acceptOrder } from '../api/orders'
import { useLocale } from '../i18n'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { useConfirm } from '../hooks/useConfirm'
import { BottomSheet } from '../components/BottomSheet'
import { useExitBack } from '../hooks/useExitBack'

// ─── Design tokens ────────────────────────────────────────────────────────────

const BLUE = '#44973A'
const BLUE_BG = '#F0F9EE'

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  order: Order
  onBack: () => void
  onChatClick: () => void
  onOrderCancelled: () => void
  onOrderAccepted: () => void
  onOrderUpdated: (order: Order) => void
  onEditClick: () => void
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export function HouseOrderStatusScreen({
  order: initialOrder,
  onBack,
  onChatClick,
  onOrderCancelled,
  onOrderAccepted,
  onOrderUpdated,
  onEditClick,
}: Props) {
  const { t } = useLocale()
  const { exiting, handleBack } = useExitBack(onBack)
  const { confirm, dialogProps } = useConfirm()
  const [order, setOrder] = useState(initialOrder)
  const [loading, setLoading] = useState(false)
  const [counterSheetOpen, setCounterSheetOpen] = useState(false)
  const [counterPrice, setCounterPrice] = useState('')

  function update(o: Order) {
    setOrder(o)
    onOrderUpdated(o)
  }

  async function handleConfirmPrice() {
    setLoading(true)
    try {
      const updated = await confirmPrice(order.id)
      update(updated)
    } catch { /* ignore */ }
    setLoading(false)
  }

  async function handleRejectPrice() {
    const ok = await confirm(t('confirm_reject_price'), { confirmVariant: 'danger' })
    if (!ok) return
    setLoading(true)
    try {
      const updated = await rejectPrice(order.id)
      update(updated)
    } catch { /* ignore */ }
    setLoading(false)
  }

  async function handleCounterPrice() {
    const price = parseInt(counterPrice.replace(/\D/g, ''), 10)
    if (!price) return
    setCounterSheetOpen(false)
    setLoading(true)
    try {
      const updated = await rejectPrice(order.id, price)
      update(updated)
    } catch { /* ignore */ }
    setLoading(false)
  }

  async function handleCancel() {
    const ok = await confirm(t('confirm_cancel_new_order'), { confirmVariant: 'danger' })
    if (!ok) return
    setLoading(true)
    await cancelOrder(order.id).catch(() => {})
    setLoading(false)
    onOrderCancelled()
  }

  async function handleAcceptWork() {
    const ok = await confirm(t('confirm_accept_work_house'), { confirmVariant: 'primary' })
    if (!ok) return
    setLoading(true)
    await acceptOrder(order.id).catch(() => {})
    setLoading(false)
    onOrderAccepted()
  }

  return (
    <div class={`min-h-screen bg-gray-50 flex flex-col ${exiting ? 'animate-slide-out-right' : 'animate-slide-in-right'}`}>
      <ConfirmDialog
        {...dialogProps}
        confirmLabel={dialogProps.confirmLabel ?? t('dialog_ok')}
        cancelLabel={dialogProps.cancelLabel ?? t('dialog_cancel')}
      />

      {/* Counter-price bottom sheet */}
      {
        <BottomSheet open={counterSheetOpen} onClose={() => setCounterSheetOpen(false)}>
          <div class="px-5 pb-6 pt-2">
            <div class="flex items-center justify-between mb-4">
              <p class="text-base font-semibold text-gray-900">{t('house_btn_counter_price')}</p>
              <button type="button" onClick={() => setCounterSheetOpen(false)} class="text-gray-400 p-1">
                <X size={20} />
              </button>
            </div>
            <label class="block text-xs text-gray-500 mb-1.5">{t('house_counter_price_label')}</label>
            <div class="flex items-center gap-2 bg-gray-100 rounded-2xl px-4 py-3 mb-4">
              <input
                type="number"
                inputMode="numeric"
                value={counterPrice}
                onInput={e => setCounterPrice((e.target as HTMLInputElement).value)}
                placeholder={t('house_counter_price_placeholder')}
                class="flex-1 bg-transparent outline-none text-sm text-gray-900 placeholder-gray-400"
              />
              <span class="text-sm text-gray-400">{t('currency')}</span>
            </div>
            <button
              type="button"
              disabled={!counterPrice || loading}
              onClick={handleCounterPrice}
              class="w-full py-4 rounded-2xl font-semibold text-sm bg-[#44973A] text-white disabled:opacity-40 active:scale-95 transition-all"
            >
              {t('house_counter_price_send')}
            </button>
          </div>
        </BottomSheet>
      }

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
      </div>

      <div class="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3 pb-8">
        <StatusContent
          order={order}
          loading={loading}
          onConfirmPrice={handleConfirmPrice}
          onRejectPrice={handleRejectPrice}
          onCounterPrice={() => setCounterSheetOpen(true)}
          onCancel={handleCancel}
          onAcceptWork={handleAcceptWork}
          onChat={onChatClick}
          onEdit={onEditClick}
        />
      </div>
    </div>
  )
}

// ─── Status content switcher ──────────────────────────────────────────────────

interface ContentProps {
  order: Order
  loading: boolean
  onConfirmPrice: () => void
  onRejectPrice: () => void
  onCounterPrice: () => void
  onCancel: () => void
  onAcceptWork: () => void
  onChat: () => void
  onEdit: () => void
}

function StatusContent({ order, loading, onConfirmPrice, onRejectPrice, onCounterPrice, onCancel, onAcceptWork, onChat, onEdit }: ContentProps) {
  const { t } = useLocale()

  switch (order.status) {
    case 'new':
      return <ViewA1 order={order} onCancel={onCancel} onEdit={onEdit} loading={loading} />
    case 'assessment':
      return <ViewA2 order={order} onChat={onChat} onCancel={onCancel} onEdit={onEdit} loading={loading} />
    case 'price_submitted':
      return <ViewA3 order={order} onConfirm={onConfirmPrice} onReject={onRejectPrice} onCounter={onCounterPrice} onCancel={onCancel} loading={loading} />
    case 'price_rejected':
      return <ViewA4 order={order} onCancel={onCancel} loading={loading} />
    case 'team_formation':
      return <ViewA5 order={order} onCancel={onCancel} loading={loading} />
    case 'in_progress':
      return <ViewA6 order={order} onChat={onChat} />
    case 'awaiting_confirmation':
      return <ViewA7 order={order} onAccept={onAcceptWork} loading={loading} onChat={onChat} />
    default:
      return (
        <div class="bg-white rounded-2xl border border-gray-100 p-5 text-center">
          <p class="text-sm text-gray-500">{t(`status_${order.status}` as any) || order.status}</p>
        </div>
      )
  }
}

// ─── A1 — Поиск бригадира ─────────────────────────────────────────────────────

function ViewA1({ order, onCancel, onEdit, loading }: { order: Order; onCancel: () => void; onEdit: () => void; loading: boolean }) {
  const { t } = useLocale()
  return (
    <>
      <div class="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div class="px-5 pt-6 pb-5" style={`background: ${BLUE}`}>
          <div class="flex flex-col items-center gap-3">
            <PulsingDot />
            <p class="text-white text-lg font-bold">{t('house_searching_foreman')}</p>
            <p class="text-white/80 text-sm text-center">{t('house_searching_hint')}</p>
          </div>
        </div>
        <div class="px-5 py-4">
          <AddressRow address={order.address} />
        </div>
      </div>
      <button
        type="button"
        onClick={onEdit}
        class="w-full py-3.5 rounded-2xl text-sm font-medium border active:opacity-80 transition-colors"
        style={`color: ${BLUE}; border-color: ${BLUE}`}
      >
        {t('edit_order_title')}
      </button>
      <CancelBtn onCancel={onCancel} loading={loading} />
    </>
  )
}

// ─── A2 — Бригадир едет ──────────────────────────────────────────────────────

function ViewA2({ order, onChat, onCancel, onEdit, loading }: { order: Order; onChat: () => void; onCancel: () => void; onEdit: () => void; loading: boolean }) {
  const { t } = useLocale()
  return (
    <>
      <div class="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div class="px-5 pt-5 pb-4" style={`background: ${BLUE}`}>
          <p class="text-white text-lg font-bold mb-3">{t('house_foreman_coming')}</p>
          <ForemanCard name={order.foreman_name ?? '—'} rating={order.foreman_rating} />
        </div>
        <div class="px-5 py-4 flex flex-col gap-3">
          <AddressRow address={order.address} />
          <button
            type="button"
            onClick={onChat}
            class="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-semibold transition-all active:scale-95"
            style={`background: ${BLUE_BG}; color: ${BLUE}`}
          >
            <MessageCircle size={16} />
            {t('house_btn_write_foreman')}
          </button>
        </div>
      </div>
      <button
        type="button"
        onClick={onEdit}
        class="w-full py-3.5 rounded-2xl text-sm font-medium border active:opacity-80 transition-colors"
        style={`color: ${BLUE}; border-color: ${BLUE}`}
      >
        {t('edit_order_title')}
      </button>
      <CancelBtn onCancel={onCancel} loading={loading} />
    </>
  )
}

// ─── A3 — Подтверждение цены ⭐ ──────────────────────────────────────────────

function ViewA3({ order, onConfirm, onReject, onCounter, onCancel, loading }: {
  order: Order
  onConfirm: () => void
  onReject: () => void
  onCounter: () => void
  onCancel: () => void
  loading: boolean
}) {
  const { t } = useLocale()
  const isRevised = !!order.previous_price
  const displayPrice = order.submitted_price ?? order.price

  return (
    <>
      <div class="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div class="px-5 pt-5 pb-4">
          <p class="text-base font-bold text-gray-900 mb-1">
            {isRevised ? t('house_price_revised') : t('house_price_review')}
          </p>
          <div class="flex items-center gap-2 mt-0.5">
            <ForemanAvatar name={order.foreman_name ?? '?'} size={28} />
            <p class="text-xs text-gray-500">{order.foreman_name}</p>
          </div>
        </div>

        <div class="mx-5 mb-4 bg-gray-50 rounded-2xl px-4 py-4">
          <div class="flex items-center gap-3 flex-wrap">
            <p class="text-2xl font-bold text-gray-900">
              {displayPrice.toLocaleString()} {t('currency')}
            </p>
            {isRevised && order.previous_price && (
              <p class="text-sm text-gray-400 line-through">
                {order.previous_price.toLocaleString()} {t('currency')}
              </p>
            )}
          </div>
          {order.price_comment && (
            <>
              <p class="text-[11px] text-gray-400 mt-2 mb-1">{t('house_price_includes')}</p>
              <p class="text-sm text-gray-700 leading-relaxed">{order.price_comment}</p>
            </>
          )}
        </div>
      </div>

      <div class="flex flex-col gap-2">
        <button
          type="button"
          disabled={loading}
          onClick={onConfirm}
          class="w-full py-4 rounded-2xl font-semibold text-sm text-white transition-all active:scale-95 disabled:opacity-50"
          style={`background: ${BLUE}`}
        >
          {loading ? t('btn_loading') : t('house_btn_confirm_price')}
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={onCounter}
          class="w-full py-4 rounded-2xl font-semibold text-sm transition-all active:scale-95 disabled:opacity-40 border-2"
          style={`border-color: ${BLUE}; color: ${BLUE}`}
        >
          {t('house_btn_counter_price')}
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={onReject}
          class="w-full py-3.5 rounded-2xl text-sm font-medium text-red-500 border border-red-200 active:bg-red-50 transition-colors disabled:opacity-40"
        >
          {t('house_btn_reject_price')}
        </button>
      </div>

      <button
        type="button"
        disabled={loading}
        onClick={onCancel}
        class="text-red-400 text-xs text-center w-full py-1 disabled:opacity-40"
      >
        {t('home_cancel_order')}
      </button>
    </>
  )
}

// ─── A4 — Ожидание новой цены ────────────────────────────────────────────────

function ViewA4({ order, onCancel, loading }: { order: Order; onCancel: () => void; loading: boolean }) {
  const { t } = useLocale()
  return (
    <>
      <div class="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div class="px-5 pt-6 pb-5 flex flex-col items-center gap-3">
          <div class="w-14 h-14 rounded-full bg-amber-50 flex items-center justify-center text-2xl">⏳</div>
          <p class="text-base font-bold text-gray-900">{t('house_waiting_new_price')}</p>
          <p class="text-sm text-gray-500 text-center">{t('house_rejected_hint')}</p>
          {order.previous_price && (
            <p class="text-sm text-gray-400 line-through">
              {order.previous_price.toLocaleString()} {t('currency')}
            </p>
          )}
        </div>
      </div>
      <CancelBtn onCancel={onCancel} loading={loading} />
    </>
  )
}

// ─── A5 — Команда формируется ─────────────────────────────────────────────────

function ViewA5({ order, onCancel, loading }: { order: Order; onCancel: () => void; loading: boolean }) {
  const { t } = useLocale()
  return (
    <>
      <div class="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div class="px-5 pt-6 pb-5 flex flex-col items-center gap-3">
          <PulsingDot />
          <p class="text-base font-bold text-gray-900">{t('house_team_forming')}</p>
          <p class="text-lg font-bold" style={`color: ${BLUE}`}>
            {(order.submitted_price ?? order.price).toLocaleString()} {t('currency')}
          </p>
          <p class="text-sm text-gray-400 text-center">{t('house_team_forming_hint')}</p>
        </div>
      </div>
      <button
        type="button"
        disabled={loading}
        onClick={onCancel}
        class="w-full py-3.5 rounded-2xl text-sm font-medium text-red-500 border border-red-200 active:bg-red-50 transition-colors disabled:opacity-40"
      >
        {t('house_cancel_free')}
      </button>
    </>
  )
}

// ─── A6 — Уборка идёт ────────────────────────────────────────────────────────

function ViewA6({ order, onChat }: { order: Order; onChat: () => void }) {
  const { t } = useLocale()
  const members = order.team_members ?? []
  return (
    <div class="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <div class="px-5 pt-5 pb-2" style="background: #44973A">
        <p class="text-white text-lg font-bold mb-3">{t('house_cleaning_progress')}</p>
        {members.length > 0 && (
          <TeamAvatarRow members={members} />
        )}
      </div>
      <div class="px-5 py-4 flex flex-col gap-3">
        <AddressRow address={order.address} />
        <button
          type="button"
          onClick={onChat}
          class="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-semibold transition-all active:scale-95"
          style={`background: ${BLUE_BG}; color: ${BLUE}`}
        >
          <MessageCircle size={16} />
          {t('house_btn_write_foreman')}
        </button>
      </div>
    </div>
  )
}

// ─── A7 — Подтверждение завершения ⭐ ────────────────────────────────────────

function ViewA7({ order, onAccept, loading, onChat }: { order: Order; onAccept: () => void; loading: boolean; onChat: () => void }) {
  const { t } = useLocale()
  const members = order.team_members ?? []
  return (
    <>
      <div class="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div class="px-5 pt-6 pb-5 flex flex-col items-center gap-3">
          <div class="text-4xl">✨</div>
          <p class="text-base font-bold text-gray-900">{t('house_work_done')}</p>
          <p class="text-2xl font-bold" style={`color: ${BLUE}`}>
            {(order.submitted_price ?? order.price).toLocaleString()} {t('currency')}
          </p>
          {members.length > 0 && <TeamAvatarRow members={members} />}
        </div>
      </div>
      <div class="flex flex-col gap-2">
        <button
          type="button"
          disabled={loading}
          onClick={onAccept}
          class="w-full py-4 rounded-2xl font-semibold text-sm text-white transition-all active:scale-95 disabled:opacity-50"
          style={`background: ${BLUE}`}
        >
          {loading ? t('btn_loading') : t('house_btn_accept_work')}
        </button>
        <button
          type="button"
          onClick={onChat}
          class="w-full py-3.5 rounded-2xl text-sm font-medium border border-gray-200 text-gray-600 active:bg-gray-50 transition-colors"
        >
          {t('house_complaints')}
        </button>
      </div>
    </>
  )
}

// ─── Reusable sub-components ─────────────────────────────────────────────────

function PulsingDot() {
  return (
    <div class="relative w-12 h-12 flex items-center justify-center">
      <span
        class="absolute inset-0 rounded-full animate-ping"
        style="background: rgba(255,255,255,0.3); animation-duration: 1.5s"
      />
      <span class="w-5 h-5 rounded-full bg-white" />
    </div>
  )
}

function ForemanCard({ name, rating }: { name: string; rating?: number | null }) {
  const { t } = useLocale()
  return (
    <div class="bg-white/10 rounded-2xl px-4 py-3 flex items-center gap-3">
      <ForemanAvatar name={name} size={40} />
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2">
          <p class="text-white font-semibold text-sm">{name}</p>
          <span class="text-[10px] bg-white/20 text-white px-2 py-0.5 rounded-full">{t('house_foreman_badge')}</span>
        </div>
        {rating != null && (
          <StarRating score={rating} dark />
        )}
      </div>
    </div>
  )
}

function ForemanAvatar({ name, size = 40 }: { name: string; size?: number }) {
  const initials = name.split(' ').map(w => w[0]).slice(0, 2).join('')
  return (
    <div
      class="rounded-full flex items-center justify-center shrink-0 font-semibold text-white"
      style={`width: ${size}px; height: ${size}px; background: ${BLUE}; font-size: ${size * 0.35}px`}
    >
      {initials || '?'}
    </div>
  )
}

function StarRating({ score, dark = false }: { score: number; dark?: boolean }) {
  const full = Math.round(score)
  return (
    <div class="flex items-center gap-0.5">
      {[1,2,3,4,5].map(i => (
        <svg key={i} width="12" height="12" viewBox="0 0 12 12" fill={i <= full ? '#FBBF24' : 'none'} stroke={dark ? 'rgba(255,255,255,0.4)' : '#D1D5DB'} stroke-width="1">
          <path d="M6 1l1.3 2.6 2.9.4-2.1 2 .5 2.9L6 7.5 3.4 8.9l.5-2.9L2 4l2.9-.4z" />
        </svg>
      ))}
      <span class={`text-[10px] ml-1 ${dark ? 'text-white/70' : 'text-gray-400'}`}>{score.toFixed(1)}</span>
    </div>
  )
}

function TeamAvatarRow({ members }: { members: Array<{ executor_id: string; name: string; role: string }> }) {
  return (
    <div class="flex items-center gap-2 flex-wrap">
      {members.map((m) => {
        const initials = m.name.split(' ').map(w => w[0]).slice(0, 2).join('')
        const isForeman = m.role === 'foreman'
        return (
          <div key={m.executor_id} class="flex flex-col items-center gap-1">
            <div class="relative">
              <div
                class="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold"
                style={`background: ${isForeman ? BLUE : '#E0F3DC'}; color: ${isForeman ? 'white' : '#2D6126'}`}
              >
                {initials}
              </div>
              {isForeman && (
                <span class="absolute -bottom-1 -right-1 w-4 h-4 bg-amber-400 rounded-full border-2 border-white flex items-center justify-center text-[8px]">★</span>
              )}
            </div>
            <p class="text-[10px] text-white/80 leading-tight max-w-[48px] text-center truncate">{m.name.split(' ')[0]}</p>
          </div>
        )
      })}
    </div>
  )
}

function AddressRow({ address }: { address: string }) {
  return (
    <div class="flex items-start gap-2">
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none" class="shrink-0 mt-0.5 text-gray-400">
        <path d="M7.5 1A5 5 0 0 1 12.5 6c0 3.5-5 8.5-5 8.5S2.5 9.5 2.5 6A5 5 0 0 1 7.5 1z" stroke="currentColor" stroke-width="1.3"/>
        <circle cx="7.5" cy="6" r="1.5" stroke="currentColor" stroke-width="1.3"/>
      </svg>
      <p class="text-sm text-gray-800 leading-snug">{address}</p>
    </div>
  )
}

function CancelBtn({ onCancel, loading }: { onCancel: () => void; loading: boolean }) {
  const { t } = useLocale()
  return (
    <button
      type="button"
      disabled={loading}
      onClick={onCancel}
      class="w-full py-3.5 rounded-2xl text-sm font-medium text-red-500 border border-red-200 active:bg-red-50 transition-colors disabled:opacity-40"
    >
      {t('home_cancel_order')}
    </button>
  )
}

// ─── Exported atoms (used in UIKit) ──────────────────────────────────────────

export { PulsingDot, ForemanCard, ForemanAvatar, StarRating, TeamAvatarRow, AddressRow }
export { ViewA1, ViewA2, ViewA3, ViewA4, ViewA5, ViewA6, ViewA7 }
