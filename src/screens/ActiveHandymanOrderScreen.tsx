import { useState, useEffect } from 'preact/hooks'
import {
  MapPin, CalendarDays, Banknote, Wrench, MessageCircle,
  User as UserIcon, Clock, Car, DoorOpen, CheckCircle2,
  X, ChevronRight, HeadphonesIcon,
} from 'lucide-react'
import type { ComponentType } from 'preact'
import type { JSX } from 'preact'
import type { HandymanOrder } from '../api/orders'
import { cancelHandymanOrder, acceptHandymanOrder } from '../api/orders'
import type { OrderAttachment } from '../api/attachments'
import { getOrderAttachments } from '../api/attachments'
import { useLocale } from '../i18n'
import type { Lang } from '../i18n/locales'
import { useExitBack } from '../hooks/useExitBack'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { useConfirm } from '../hooks/useConfirm'

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_TIMELINE = ['new', 'assigned', 'on_the_way', 'arrived', 'in_progress', 'awaiting_confirmation', 'completed']

const STATUS_ICON: Record<string, ComponentType<any>> = {
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
  cancelled:             'Отменён',
}

// ─── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  order: HandymanOrder
  onBack: () => void
  onChatClick: (orderId: string, executorId: string | null, executorName: string) => void
  onOrderCancelled: () => void
  onOrderAccepted: () => void
  onSupportClick: () => void
  onEditClick?: () => void
  /** Передаётся при открытии из истории — показывает кнопку «Повторить заказ». */
  onRepeat?: () => void
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function ActiveHandymanOrderScreen({
  order: initialOrder,
  onBack,
  onChatClick,
  onOrderCancelled,
  onOrderAccepted,
  onSupportClick,
  onEditClick,
  onRepeat,
}: Props) {
  const { t, lang } = useLocale()
  const { exiting, handleBack } = useExitBack(onBack)
  const { confirm, dialogProps } = useConfirm()
  const [order, setOrder] = useState(initialOrder)
  const [loading, setLoading] = useState(false)
  const [attachments, setAttachments] = useState<OrderAttachment[]>([])

  useEffect(() => {
    getOrderAttachments(order.id).then(a => setAttachments(Array.isArray(a) ? a : [])).catch(() => {})
  }, [order.id])

  const statusIdx = STATUS_TIMELINE.indexOf(order.status)
  const StatusIcon = STATUS_ICON[order.status] ?? Wrench
  const canCancel = CANCEL_ALLOWED.has(order.status)
  const canChat = CHAT_STATUSES.has(order.status) && !!order.executor_id
  const canEdit = order.status === 'new' || order.status === 'assigned'
  const canAccept = order.status === 'awaiting_confirmation'
  const canRepeat = !!onRepeat

  function fmtDate(iso: string): string {
    const [y, m, d] = iso.split('-').map(Number)
    return new Intl.DateTimeFormat(LOCALE_MAP[lang], { day: 'numeric', month: 'long' }).format(new Date(y, m - 1, d))
  }

  async function handleAccept() {
    const ok = await confirm(t('confirm_accept_work_handyman'), { title: t('confirm_accept_work_title'), confirmVariant: 'normal' })
    if (!ok) return
    setLoading(true)
    try {
      await acceptHandymanOrder(order.id)
      onOrderAccepted()
    } catch {
      setLoading(false)
    }
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
          </div>
        )}

        {/* Works */}
        {order.works && order.works.length > 0 && (
          <div class="bg-white rounded-2xl border border-gray-100 px-4 py-3.5">
            <p class="text-[11px] text-gray-400 font-medium uppercase tracking-wide mb-2">{t('step_addons')}</p>
            <div class="flex flex-col gap-1.5">
              {order.works.map(w => (
                <div key={w.work_id} class="flex items-center gap-2">
                  <div class="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                  <p class="text-sm text-gray-800">{w.translations[lang] ?? w.translations['ru'] ?? w.work_id}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Description */}
        {order.description && (
          <div class="bg-white rounded-2xl border border-gray-100 px-4 py-3.5">
            <p class="text-[11px] text-gray-400 font-medium uppercase tracking-wide mb-1.5">{t('handyman_comment_label')}</p>
            <p class="text-sm text-gray-800 leading-relaxed">{order.description}</p>
          </div>
        )}

        {/* Media */}
        {attachments.length > 0 && (
          <div class="bg-white rounded-2xl border border-gray-100 px-4 py-3.5">
            <p class="text-[11px] text-gray-400 font-medium uppercase tracking-wide mb-2">{t('handyman_media_label')}</p>
            <div class="grid grid-cols-3 gap-2">
              {attachments.map(att => (
                <a key={att.id} href={att.url} target="_blank" rel="noopener noreferrer" class="block aspect-square rounded-xl overflow-hidden bg-gray-100">
                  {att.media_type.startsWith('video/') ? (
                    <video src={att.url} class="w-full h-full object-cover" muted />
                  ) : (
                    <img src={att.url} alt="" class="w-full h-full object-cover" />
                  )}
                </a>
              ))}
            </div>
          </div>
        )}

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

        {/* Actions */}
        <div class="bg-white rounded-2xl border border-gray-100 overflow-hidden divide-y divide-gray-50">
          {canChat && (
            <ActionRow
              icon={<MessageCircle size={18} class="text-amber-500" />}
              label={t('chat_contact_cleaner')}
              onClick={() => onChatClick(order.id, order.executor_id ?? null, order.executor_name ?? 'Мастер')}
            />
          )}
          <ActionRow
            icon={<HeadphonesIcon size={18} class="text-gray-500" />}
            label="Поддержка"
            onClick={onSupportClick}
          />
        </div>

      </div>

      {/* Bottom buttons */}
      {(canAccept || canEdit || canCancel || canRepeat) && (
        <div class="bg-white border-t border-gray-100 px-4 py-4 flex flex-col gap-2">
          {canRepeat && (
            <button
              type="button"
              onClick={onRepeat}
              class="w-full bg-amber-500 text-white font-semibold py-4 rounded-2xl transition-all active:scale-95 text-sm"
            >
              {t('btn_repeat')}
            </button>
          )}
          {canAccept && (
            <button
              type="button"
              onClick={handleAccept}
              disabled={loading}
              class="w-full bg-amber-500 disabled:opacity-50 text-white font-semibold py-4 rounded-2xl transition-all active:scale-95 text-sm"
            >
              {t('home_accept_work')}
            </button>
          )}
          {canEdit && onEditClick && (
            <button
              type="button"
              onClick={onEditClick}
              class="w-full border-2 border-blue-500 text-blue-600 font-medium py-3.5 rounded-2xl transition-all active:scale-95 text-sm hover:bg-blue-50"
            >
              {t('edit_order_title')}
            </button>
          )}
          {canCancel && (
            <button
              type="button"
              onClick={handleCancel}
              disabled={loading}
              class="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-semibold text-red-500 bg-red-50 active:bg-red-100 transition-colors disabled:opacity-40"
            >
              <X size={16} />
              Отменить заказ
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function ActionRow({ icon, label, onClick }: { icon: JSX.Element; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      class="w-full flex items-center gap-3 px-4 py-3.5 active:bg-gray-50 transition-colors text-left"
    >
      <span class="shrink-0">{icon}</span>
      <p class="flex-1 text-sm font-medium text-gray-900">{label}</p>
      <ChevronRight size={15} class="text-gray-300 shrink-0" />
    </button>
  )
}
