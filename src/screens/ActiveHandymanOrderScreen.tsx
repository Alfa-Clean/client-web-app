import { useState } from 'preact/hooks'
import {
  MapPin, CalendarDays, Banknote, Wrench, MessageCircle,
  User as UserIcon, Clock, Car, DoorOpen, CheckCircle2,
  X, ChevronRight,
} from 'lucide-react'
import type { ComponentType } from 'preact'
import type { HandymanOrder } from '../api/orders'
import { cancelHandymanOrder } from '../api/orders'
import { useLocale } from '../i18n'
import type { Lang } from '../i18n/locales'
import { useExitBack } from '../hooks/useExitBack'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { useConfirm } from '../hooks/useConfirm'

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_TIMELINE = ['new', 'assigned', 'on_the_way', 'arrived', 'in_progress', 'awaiting_confirmation', 'completed']

const STATUS_ICON: Record<string, ComponentType<{ size?: number; color?: string; class?: string }>> = {
  new: Clock,
  assigned: UserIcon,
  on_the_way: Car,
  arrived: DoorOpen,
  in_progress: Wrench,
  awaiting_confirmation: CheckCircle2,
}

const CHAT_STATUSES = new Set(['assigned', 'on_the_way', 'arrived', 'in_progress', 'awaiting_confirmation'])
const CANCEL_ALLOWED = new Set(['new', 'assigned'])

const LOCALE_MAP: Record<Lang, string> = { ru: 'ru-RU', uz: 'uz-UZ', en: 'en-US' }

const STATUS_LABEL: Record<string, string> = {
  new:                   'Ищем мастера...',
  assigned:              'Мастер назначен',
  on_the_way:            'Мастер едет к вам',
  arrived:               'Мастер прибыл',
  in_progress:           'Идут работы',
  awaiting_confirmation: 'Примите работу',
  completed:             'Завершён',
}

// ─── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  order: HandymanOrder
  onBack: () => void
  onChatClick: (orderId: string, executorId: string | null, executorName: string) => void
  onOrderCancelled: () => void
  onOrderAccepted: () => void
  onSupportClick: () => void
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function ActiveHandymanOrderScreen({
  order: initialOrder,
  onBack,
  onChatClick,
  onOrderCancelled,
  onSupportClick,
}: Props) {
  const { t, lang } = useLocale()
  const { exiting, handleBack } = useExitBack(onBack)
  const { confirm, dialogProps } = useConfirm()
  const [order, setOrder] = useState(initialOrder)
  const [loading, setLoading] = useState(false)

  const statusIdx = STATUS_TIMELINE.indexOf(order.status)
  const StatusIcon = STATUS_ICON[order.status] ?? Wrench
  const canCancel = CANCEL_ALLOWED.has(order.status)
  const canChat = CHAT_STATUSES.has(order.status) && !!order.executor_id

  function fmtDate(iso: string): string {
    const [y, m, d] = iso.split('-').map(Number)
    return new Intl.DateTimeFormat(LOCALE_MAP[lang], { day: 'numeric', month: 'long' }).format(new Date(y, m - 1, d))
  }

  async function handleCancel() {
    const ok = await confirm(t('confirm_cancel_new_order'), { confirmVariant: 'normal' })
    if (!ok) return
    setLoading(true)
    try {
      const updated = await cancelHandymanOrder(order.id)
      setOrder(updated)
      onOrderCancelled()
    } catch {
      setLoading(false)
    }
  }

  return (
    <div
      class={`min-h-screen bg-gray-50 flex flex-col transition-transform duration-300 ${exiting ? 'translate-x-full' : 'translate-x-0'}`}
    >
      <ConfirmDialog
        {...dialogProps}
        confirmLabel={dialogProps.confirmLabel ?? t('dialog_ok')}
        cancelLabel={dialogProps.cancelLabel ?? t('dialog_cancel')}
      />

      {/* Header */}
      <div class="bg-white px-5 pt-12 pb-4 flex items-center border-b border-gray-100 relative">
        <button
          type="button"
          onClick={handleBack}
          class="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 text-lg font-light active:bg-gray-200 transition-colors"
        >
          ‹
        </button>
        <h1 class="absolute inset-x-0 text-center text-base font-bold text-gray-900 pointer-events-none">
          Хэндимен
        </h1>
      </div>

      <div class="flex-1 overflow-y-auto px-4 py-5 flex flex-col gap-4">

        {/* Status hero */}
        <div class="bg-amber-500 rounded-3xl px-5 py-6 flex flex-col items-center gap-3 text-center">
          <div class="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center">
            <StatusIcon size={28} color="white" />
          </div>
          <div>
            <p class="text-white font-bold text-lg leading-tight">
              {STATUS_LABEL[order.status] ?? order.status}
            </p>
            <p class="text-white/70 text-sm mt-0.5">Заказ № {order.order_num}</p>
          </div>
        </div>

        {/* Timeline */}
        <div class="bg-white rounded-2xl border border-gray-100 px-4 py-4">
          <div class="flex items-center justify-between">
            {STATUS_TIMELINE.slice(0, -1).map((s, i) => {
              const Icon = STATUS_ICON[s] ?? Clock
              const done = i < statusIdx
              const active = i === statusIdx
              return (
                <div key={s} class="flex items-center flex-1 last:flex-none">
                  <div class={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                    done ? 'bg-amber-500' : active ? 'bg-amber-500' : 'bg-gray-100'
                  }`}>
                    <Icon size={14} color={done || active ? 'white' : '#9CA3AF'} />
                  </div>
                  {i < STATUS_TIMELINE.length - 2 && (
                    <div class={`flex-1 h-0.5 mx-0.5 rounded-full transition-colors ${done ? 'bg-amber-500' : 'bg-gray-100'}`} />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Executor */}
        {order.executor_name && (
          <div class="bg-white rounded-2xl border border-gray-100 px-4 py-3.5 flex items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
              <UserIcon size={18} class="text-amber-600" />
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-[11px] text-gray-400 font-medium uppercase tracking-wide">Мастер</p>
              <p class="text-sm font-semibold text-gray-900 mt-0.5">{order.executor_name}</p>
            </div>
            {canChat && (
              <button
                type="button"
                onClick={() => onChatClick(order.id, order.executor_id ?? null, order.executor_name ?? 'Мастер')}
                class="w-9 h-9 rounded-full bg-amber-50 flex items-center justify-center active:bg-amber-100 transition-colors"
              >
                <MessageCircle size={18} class="text-amber-600" />
              </button>
            )}
          </div>
        )}

        {/* Description */}
        <div class="bg-white rounded-2xl border border-gray-100 px-4 py-3.5">
          <p class="text-[11px] text-gray-400 font-medium uppercase tracking-wide mb-1.5">Описание работ</p>
          <p class="text-sm text-gray-800 leading-relaxed">{order.description}</p>
        </div>

        {/* Details */}
        <div class="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
          <div class="flex items-center gap-3 px-4 py-3.5">
            <MapPin size={16} class="text-gray-400 shrink-0" />
            <p class="text-sm text-gray-700 flex-1">{order.address}</p>
          </div>
          <div class="flex items-center gap-3 px-4 py-3.5">
            <CalendarDays size={16} class="text-gray-400 shrink-0" />
            <p class="text-sm text-gray-700">
              {fmtDate(order.order_date)}
              {order.order_slot && <span class="text-gray-400">, {order.order_slot}</span>}
            </p>
          </div>
          <div class="flex items-center gap-3 px-4 py-3.5">
            <Banknote size={16} class="text-gray-400 shrink-0" />
            <p class="text-sm font-semibold text-gray-900">
              {order.price.toLocaleString('ru-RU')} сум
            </p>
          </div>
        </div>

        {/* Support */}
        <button
          type="button"
          onClick={onSupportClick}
          class="bg-white rounded-2xl border border-gray-100 px-4 py-3.5 flex items-center gap-3 active:bg-gray-50 transition-colors w-full text-left"
        >
          <div class="w-9 h-9 rounded-xl bg-green-100 flex items-center justify-center shrink-0">
            <MessageCircle size={16} class="text-green-600" />
          </div>
          <p class="flex-1 text-sm font-medium text-gray-900">Поддержка</p>
          <ChevronRight size={16} class="text-gray-300" />
        </button>

      </div>

      {/* Cancel button */}
      {canCancel && (
        <div class="bg-white border-t border-gray-100 px-4 py-4">
          <button
            type="button"
            onClick={handleCancel}
            disabled={loading}
            class="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-semibold text-red-500 bg-red-50 active:bg-red-100 transition-colors disabled:opacity-40"
          >
            <X size={16} />
            Отменить заказ
          </button>
        </div>
      )}
    </div>
  )
}
