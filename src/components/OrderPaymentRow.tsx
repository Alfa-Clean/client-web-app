import { useEffect, useState } from 'preact/hooks'
import { CreditCard, Wallet } from 'lucide-react'
import { useLocale } from '../i18n'
import { ApiError } from '../api/client'
import { cardLabel, listCards, type Card } from '../api/cards'
import { changePaymentMethod, type PaymentMethodChange, type OrderPayment, type PaymentMethod } from '../api/orders'
import { BottomSheet } from './BottomSheet'
import { PaymentMethodPicker, type PaymentChoice } from './PaymentMethodPicker'

/** После этих статусов способ оплаты не меняется — как на бэкенде (Р16). */
const CLOSED_STATUSES = new Set(['completed', 'cancelled', 'disputed'])

interface Props {
  vertical: 'cleaning' | 'handyman'
  order: {
    id: string
    status: string
    payment_method?: PaymentMethod
    card_id?: string | null
    payment?: OrderPayment | null
  }
  /** Пояснение под выбором карты в шторке. */
  cardNote?: string
  onChanged: (change: PaymentMethodChange) => void
}

/**
 * Строка «Оплата» в карточке заказа: способ, состояние денег на карте и
 * смена способа до принятия работы. Отказ банка оставляет заказ на наличных —
 * об этом говорит текст ошибки, а строка показывает то, что вернул сервер.
 */
export function OrderPaymentRow({ vertical, order, cardNote, onChanged }: Props) {
  const { t } = useLocale()
  const [cards, setCards] = useState<Card[]>([])
  const [open, setOpen] = useState(false)
  const [choice, setChoice] = useState<PaymentChoice>({ method: 'cash', cardId: null })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const method = order.payment_method ?? 'cash'
  const editable = !CLOSED_STATUSES.has(order.status)

  useEffect(() => {
    if (method !== 'card') return
    listCards().then(setCards).catch(() => setCards([]))
  }, [method, order.card_id])

  const card = cards.find(c => c.id === order.card_id)
  const title = method === 'card' ? (card ? cardLabel(card) : t('payment_method_title')) : t('payment_cash')
  const status = order.payment?.status
  const statusText = method === 'card' && status ? t(`payment_status_${status}`) : null

  function startEdit() {
    setChoice({ method, cardId: order.card_id ?? null })
    setError(null)
    setOpen(true)
  }

  async function save() {
    setSaving(true)
    setError(null)
    try {
      const change = await changePaymentMethod(vertical, order.id, choice.method, choice.cardId)
      onChanged(change)
      setOpen(false)
    } catch (e) {
      const message = e instanceof ApiError ? e.context.message : null
      setError(typeof message === 'string' ? message : t('payment_error'))
    } finally {
      setSaving(false)
    }
  }

  const unchanged = choice.method === method && (choice.cardId ?? null) === (order.card_id ?? null)

  return (
    <>
      <div class="flex items-center justify-between gap-3 px-4 py-3">
        <div class="flex items-center gap-3 min-w-0">
          {method === 'card'
            ? <CreditCard size={15} class="text-gray-400 shrink-0" />
            : <Wallet size={15} class="text-gray-400 shrink-0" />}
          <div class="min-w-0">
            <p class="text-sm text-gray-900 truncate tabular-nums">{title}</p>
            {statusText && <p class="text-xs text-gray-400">{statusText}</p>}
          </div>
        </div>
        {editable && (
          <button type="button" onClick={startEdit} class="text-sm font-medium text-[#1F847B] shrink-0 active:opacity-70">
            {t('payment_change')}
          </button>
        )}
      </div>

      <BottomSheet open={open} onClose={() => setOpen(false)}>
        <div class="px-5 pb-6 pt-2 flex flex-col gap-4">
          <p class="text-base font-semibold text-gray-900">{t('payment_method_title')}</p>
          <PaymentMethodPicker value={choice} onChange={setChoice} cardNote={cardNote} canBind />
          {error && <p class="text-sm text-red-500">{error}</p>}
          <button
            type="button"
            disabled={saving || unchanged || (choice.method === 'card' && !choice.cardId)}
            onClick={save}
            class="w-full py-4 rounded-2xl font-semibold text-sm bg-[#1F847B] text-white disabled:opacity-40 active:scale-95 transition-all"
          >
            {t('dialog_ok')}
          </button>
        </div>
      </BottomSheet>
    </>
  )
}
