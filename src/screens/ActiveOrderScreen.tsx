import { useEffect, useState } from 'preact/hooks'
import {
  MapPin, CalendarDays, Banknote, Sparkles, MessageCircle,
  User as UserIcon, Clock, Car, DoorOpen, CheckCircle2, PartyPopper,
  HeadphonesIcon, ChevronRight,
} from 'lucide-react'
import type { ComponentType } from 'preact'
import type { JSX } from 'preact'
import type { Order } from '../api/orders'
import { cancelOrder, acceptOrder } from '../api/orders'
import type { Addon } from '../api/addons'
import { getAddons } from '../api/addons'
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
  in_progress: Sparkles,
  awaiting_confirmation: CheckCircle2,
  completed: PartyPopper,
}

const CHAT_STATUSES = new Set(['assigned', 'on_the_way', 'arrived', 'in_progress', 'awaiting_confirmation'])
const CANCEL_ALLOWED = new Set(['new', 'assigned', 'on_the_way'])

const LOCALE_MAP: Record<Lang, string> = { ru: 'ru-RU', uz: 'uz-UZ', en: 'en-US' }

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  order: Order
  onBack: () => void
  onChatClick: (orderId: string, executorId: string | null, executorName: string) => void
  onOrderCancelled: () => void
  onOrderAccepted: () => void
  onSupportClick: () => void
  onEditClick: () => void
  /** Передаётся при открытии из истории — показывает кнопку «Повторить заказ». */
  onRepeat?: () => void
}

// ─── Component ───────────────────────────────────────────────────────────────

export function ActiveOrderScreen({
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
  const [order] = useState(initialOrder)
  const [loading, setLoading] = useState(false)
  const [addonsCatalog, setAddonsCatalog] = useState<Addon[]>([])

  useEffect(() => {
    if (order.addons.length > 0) {
      getAddons().then(setAddonsCatalog).catch(() => {})
    }
  }, [])

  const statusIdx = STATUS_TIMELINE.indexOf(order.status)
  const StatusIcon = STATUS_ICON[order.status] ?? Sparkles


  async function handleCancel() {
    const isNew = order.status === 'new'
    const ok = await confirm(
      isNew ? t('confirm_cancel_new_order') : t('confirm_cancel_order'),
      {
        title: isNew ? undefined : t('confirm_cancel_order_title'),
        confirmVariant: isNew ? 'normal' : 'danger',
        cancelVariant: isNew ? 'danger' : 'normal',
        confirmLabel: t('dialog_btn_cancel_order'),
        cancelLabel: isNew ? t('dialog_btn_no') : t('dialog_cancel'),
      },
    )
    if (!ok) return
    setLoading(true)
    await cancelOrder(order.id).catch(() => {})
    setLoading(false)
    onOrderCancelled()
  }

  async function handleAccept() {
    const ok = await confirm(t('confirm_accept_work'), {
      title: t('confirm_accept_work_title'),
      confirmVariant: 'primary',
    })
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

      {/* Header */}
      <div class="bg-white px-4 pt-12 pb-4 flex items-center gap-3 border-b border-gray-100 shrink-0">
        <button
          type="button"
          onClick={handleBack}
          class="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 active:bg-gray-200 transition-colors text-gray-700 text-xl shrink-0"
        >
          ‹
        </button>
        <div class="flex-1 min-w-0 absolute inset-x-0 text-center pointer-events-none">
          <p class="text-base font-semibold text-gray-900">
            {t('history_order', { num: String(order.order_num) })}
          </p>
        </div>
      </div>

      <div class="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3 pb-6">

        {/* Status hero */}
        <div class="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div class="bg-green-600 px-5 pt-6 pb-5">
            <div class="flex items-center gap-4">
              <div class="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
                <StatusIcon size={28} class="text-white" />
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-white/70 text-xs mb-0.5">
                  {t(`svc_${order.service_type}`) || order.service_type}
                </p>
                <p class="text-white text-lg font-bold leading-tight">
                  {t(`status_${order.status}`) || order.status}
                </p>
                {order.executor_name && (
                  <p class="text-white/80 text-xs mt-1 flex items-center gap-1">
                    <UserIcon size={11} class="inline" />
                    {order.executor_name}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div class="px-5 py-4">
            <div class="relative flex items-center justify-between">
              <div class="absolute inset-x-0 top-1/2 -translate-y-1/2 h-0.5 bg-gray-200" />
              <div
                class="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 bg-green-500 transition-all duration-500"
                style={`width:${statusIdx / (STATUS_TIMELINE.length - 1) * 100}%`}
              />
              {STATUS_TIMELINE.map((s, i) => (
                <div
                  key={s}
                  class={`relative z-10 w-2.5 h-2.5 rounded-full shrink-0 transition-colors ${
                    i < statusIdx  ? 'bg-green-500' :
                    i === statusIdx ? 'bg-green-600 ring-4 ring-green-100' :
                    'bg-gray-200'
                  }`}
                />
              ))}
            </div>
            <div class="flex justify-between mt-2">
              <p class="text-[10px] text-gray-400">{t('status_new')}</p>
              <p class="text-[10px] text-gray-400">{t('status_completed')}</p>
            </div>
          </div>
        </div>

        {/* Order details */}
        <div class="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
          <DetailRow icon={<MapPin size={15} />}       label={t('confirm_address')} value={order.address} />
          <DetailRow icon={<CalendarDays size={15} />} label={t('confirm_date')}    value={formatDate(order.order_date, order.order_slot, lang, LOCALE_MAP)} />
          <DetailRow icon={<Sparkles size={15} />}     label={t('confirm_service')} value={t(`svc_${order.service_type}`) || order.service_type} />
          {order.addons.length > 0 && (
            <div class="flex items-start gap-3 px-4 py-3">
              <span class="text-gray-400 mt-0.5 shrink-0"><Sparkles size={15} /></span>
              <div class="flex-1 min-w-0">
                <p class="text-xs text-gray-400 mb-1">{t('confirm_addons')}</p>
                <ul class="flex flex-col gap-0.5">
                  {order.addons.map(a => {
                    const found = addonsCatalog.find(x => x.id === a.id)
                    const name = found ? (found.translations[lang] ?? found.translations['ru'] ?? a.id) : a.id
                    const qty = a.qty ?? 1
                    return (
                      <li key={a.id} class="flex items-center justify-between gap-2">
                        <span class="text-sm text-gray-800">{name}</span>
                        {qty > 1 && <span class="text-xs text-gray-400 shrink-0">× {qty}</span>}
                      </li>
                    )
                  })}
                </ul>
              </div>
            </div>
          )}
          {order.comment && (
            <DetailRow icon={<MessageCircle size={15} />} label={t('history_comment_label')} value={order.comment} />
          )}
          <div class="flex items-center justify-between px-4 py-3">
            <div class="flex items-center gap-3">
              <Banknote size={15} class="text-gray-400 shrink-0" />
              <p class="text-sm text-gray-500">{t('confirm_total')}</p>
            </div>
            <p class="text-sm font-bold text-gray-900">{order.price.toLocaleString()} {t('currency')}</p>
          </div>
        </div>

        {/* Actions */}
        <div class="bg-white rounded-2xl border border-gray-100 overflow-hidden divide-y divide-gray-50">
          {CHAT_STATUSES.has(order.status) && order.executor_id && order.executor_name && (
            <ActionRow
              icon={<MessageCircle size={18} class="text-green-600" />}
              label={t('chat_contact_cleaner')}
              onClick={() => onChatClick(order.id, order.executor_id ?? null, order.executor_name!)}
            />
          )}
          <ActionRow
            icon={<HeadphonesIcon size={18} class="text-gray-500" />}
            label="Поддержка"
            onClick={onSupportClick}
          />
        </div>

        {/* Accept / Cancel / Edit / Repeat */}
        <div class="flex flex-col gap-2">
          {onRepeat && (
            <button
              type="button"
              onClick={onRepeat}
              class="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-4 rounded-2xl transition-all active:scale-95 text-sm"
            >
              {t('btn_repeat')}
            </button>
          )}
          {order.status === 'awaiting_confirmation' && (
            <button
              type="button"
              disabled={loading}
              onClick={handleAccept}
              class="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold py-4 rounded-2xl transition-all active:scale-95 text-sm"
            >
              {t('home_accept_work')}
            </button>
          )}
          {(order.status === 'new' || order.status === 'assigned') && (
            <button
              type="button"
              onClick={onEditClick}
              class="w-full border-2 border-blue-500 text-blue-600 font-medium py-3.5 rounded-2xl transition-all active:scale-95 text-sm hover:bg-blue-50"
            >
              {t('edit_order_title')}
            </button>
          )}
          {CANCEL_ALLOWED.has(order.status) && (
            <button
              type="button"
              disabled={loading}
              onClick={handleCancel}
              class="w-full border-2 border-red-400 text-red-500 font-medium py-3.5 rounded-2xl transition-all active:scale-95 text-sm hover:bg-red-50 disabled:opacity-50"
            >
              {t('home_cancel_order')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(dateStr: string, slot: string, lang: Lang, localeMap: Record<Lang, string>): string {
  const d = new Date(dateStr).toLocaleDateString(localeMap[lang], { day: 'numeric', month: 'long' })
  return slot ? `${d}, ${slot}` : d
}

function DetailRow({ icon, label, value }: { icon: JSX.Element; label: string; value: string }) {
  return (
    <div class="flex items-start gap-3 px-4 py-3">
      <span class="text-gray-400 mt-0.5 shrink-0">{icon}</span>
      <div class="flex-1 min-w-0">
        <p class="text-xs text-gray-400 mb-0.5">{label}</p>
        <p class="text-sm text-gray-800 break-words">{value}</p>
      </div>
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
