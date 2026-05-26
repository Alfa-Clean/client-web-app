import type { ComponentType } from 'preact'
import type { JSX } from 'preact'
import {
  Package, Droplets, Wind, CheckCircle2, PartyPopper,
  Shirt, MapPin, CalendarDays, Banknote, HeadphonesIcon,
  ChevronRight,
} from 'lucide-react'
import { useExitBack } from '../hooks/useExitBack'
import { useLocale } from '../i18n'

// ─── Data model ───────────────────────────────────────────────────────────────

export type ChistomatyStatus = 'received' | 'washing' | 'drying' | 'ready' | 'collected'

export interface ChistomatyOrder {
  id: string
  order_num: number
  status: ChistomatyStatus
  postamat_address: string
  created_at: string
  items_count: number
  price: number
  estimated_ready?: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

export const CHISTOMATY_TIMELINE: ChistomatyStatus[] = [
  'received', 'washing', 'drying', 'ready', 'collected',
]

export const CHISTOMATY_STATUS_LABEL: Record<ChistomatyStatus, string> = {
  received:  'Вещи приняты',
  washing:   'Стирается',
  drying:    'Сушится',
  ready:     'Готово к выдаче',
  collected: 'Вещи забраны',
}

export const CHISTOMATY_STATUS_ICON: Record<ChistomatyStatus, ComponentType<{ size?: number; color?: string; class?: string }>> = {
  received:  Package,
  washing:   Droplets,
  drying:    Wind,
  ready:     CheckCircle2,
  collected: PartyPopper,
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  order: ChistomatyOrder
  onBack: () => void
  onSupportClick: () => void
}

// ─── Component ───────────────────────────────────────────────────────────────

export function ActiveChistomatyScreen({ order, onBack, onSupportClick }: Props) {
  const { t } = useLocale()
  const { exiting, handleBack } = useExitBack(onBack)

  const statusIdx = CHISTOMATY_TIMELINE.indexOf(order.status)
  const StatusIcon = CHISTOMATY_STATUS_ICON[order.status]
  const statusLabel = CHISTOMATY_STATUS_LABEL[order.status]

  return (
    <div class={`min-h-screen bg-gray-50 flex flex-col ${exiting ? 'animate-slide-out-right' : 'animate-slide-in-right'}`}>

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
            Заказ №{order.order_num}
          </p>
        </div>
      </div>

      <div class="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3 pb-8">

        {/* Status hero */}
        <div class="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div class="bg-blue-600 px-5 pt-6 pb-5">
            <div class="flex items-center gap-4">
              <div class="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
                <StatusIcon size={28} class="text-white" />
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-white/70 text-xs mb-0.5">Чистоматы</p>
                <p class="text-white text-lg font-bold leading-tight">{statusLabel}</p>
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div class="px-5 py-4">
            <div class="relative flex items-center justify-between">
              <div class="absolute inset-x-0 top-1/2 -translate-y-1/2 h-0.5 bg-gray-200" />
              <div
                class="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 bg-blue-500 transition-all duration-500"
                style={`width:${statusIdx / (CHISTOMATY_TIMELINE.length - 1) * 100}%`}
              />
              {CHISTOMATY_TIMELINE.map((s, i) => {
                const Icon = CHISTOMATY_STATUS_ICON[s]
                const done = i < statusIdx
                const current = i === statusIdx
                return (
                  <div
                    key={s}
                    class={`relative z-10 w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                      current ? 'bg-blue-600 ring-4 ring-blue-100' :
                      done    ? 'bg-blue-400' :
                      'bg-gray-200'
                    }`}
                  >
                    <Icon size={13} class="text-white" />
                  </div>
                )
              })}
            </div>
            <div class="flex justify-between mt-2">
              <p class="text-[10px] text-gray-400">Принято</p>
              <p class="text-[10px] text-gray-400">Забрано</p>
            </div>
          </div>
        </div>

        {/* Order details */}
        <div class="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
          <DetailRow
            icon={<MapPin size={15} />}
            label="Постамат"
            value={order.postamat_address}
          />
          <DetailRow
            icon={<Shirt size={15} />}
            label="Вещей"
            value={`${order.items_count} шт.`}
          />
          {order.estimated_ready && (
            <DetailRow
              icon={<CalendarDays size={15} />}
              label="Готово к"
              value={order.estimated_ready}
            />
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
        <div class="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <ActionRow
            icon={<HeadphonesIcon size={18} class="text-gray-500" />}
            label="Поддержка"
            onClick={onSupportClick}
          />
        </div>

      </div>
    </div>
  )
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

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
