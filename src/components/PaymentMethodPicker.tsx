import { useEffect, useState } from 'preact/hooks'
import { Banknote, CreditCard, Plus } from 'lucide-react'
import { useLocale } from '../i18n'
import { cardLabel, listCards, type Card } from '../api/cards'
import type { PaymentMethod } from '../api/orders'
import { BindCardSheet } from './BindCardSheet'

export interface PaymentChoice {
  method: PaymentMethod
  cardId: string | null
}

interface Props {
  value: PaymentChoice
  onChange: (choice: PaymentChoice) => void
  /** Пояснение под выбором карты: когда заморозятся деньги. */
  cardNote?: string
  /** Можно ли привязывать карту: нужен подтверждённый клиент. */
  canBind: boolean
}

/**
 * Способ оплаты: наличные исполнителю или привязанная карта. Картой — холд:
 * деньги замораживаются и списываются после работы, при отмене возвращаются.
 */
export function PaymentMethodPicker({ value, onChange, cardNote, canBind }: Props) {
  const { t } = useLocale()
  const [cards, setCards] = useState<Card[]>([])
  const [binding, setBinding] = useState(false)

  useEffect(() => {
    if (!canBind) return
    // Не клиент (аноним Mini App) — карт нет, остаются наличные.
    listCards().then(setCards).catch(() => setCards([]))
  }, [canBind])

  const option = (active: boolean) =>
    `w-full flex items-center gap-3 px-4 py-3 rounded-2xl border-2 text-left transition-colors ${
      active ? 'border-[#1F847B] bg-[#F3F9F9]' : 'border-gray-200 bg-white'
    }`

  return (
    <div class="flex flex-col gap-2">
      <button type="button" class={option(value.method === 'cash')} onClick={() => onChange({ method: 'cash', cardId: null })}>
        <Banknote size={18} class="text-gray-500 shrink-0" />
        <span class="text-sm font-medium text-gray-900">{t('payment_cash')}</span>
      </button>
      {cards.map(card => {
        const active = value.method === 'card' && value.cardId === card.id
        return (
          <button type="button" key={card.id} class={option(active)} onClick={() => onChange({ method: 'card', cardId: card.id })}>
            <CreditCard size={18} class="text-gray-500 shrink-0" />
            <span class="text-sm font-medium text-gray-900 tabular-nums">{cardLabel(card)}</span>
          </button>
        )
      })}
      {canBind && (
        <button
          type="button"
          onClick={() => setBinding(true)}
          class="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-[#1F847B] active:opacity-70"
        >
          <Plus size={16} />
          {t('payment_card_add')}
        </button>
      )}
      {value.method === 'card' && cardNote && (
        <p class="text-xs text-gray-400 leading-relaxed px-1">{cardNote}</p>
      )}
      <BindCardSheet
        open={binding}
        onClose={() => setBinding(false)}
        onBound={card => {
          setBinding(false)
          setCards(prev => [card, ...prev])
          onChange({ method: 'card', cardId: card.id })
        }}
      />
    </div>
  )
}
