import { useEffect, useState } from 'preact/hooks'
import { CreditCard, Plus, Trash2 } from 'lucide-react'
import { useLocale } from '../i18n'
import { cardLabel, listCards, unbindCard, type Card } from '../api/cards'
import { BindCardSheet } from './BindCardSheet'

interface Props {
  confirm: (message: string, options?: { confirmVariant?: 'danger' | 'primary' | 'normal'; confirmLabel?: string }) => Promise<boolean>
}

/** «Мои карты» в профиле: привязать и отвязать. */
export function CardsSection({ confirm }: Props) {
  const { t } = useLocale()
  const [cards, setCards] = useState<Card[] | null>(null)
  const [binding, setBinding] = useState(false)

  useEffect(() => {
    listCards().then(setCards).catch(() => setCards(null))
  }, [])

  // Не клиент (аноним Mini App без номера) — блока нет: карта нужна клиенту.
  if (cards === null) return null

  async function remove(card: Card) {
    const ok = await confirm(t('card_unbind_confirm', { card: cardLabel(card) }), {
      confirmVariant: 'danger',
      confirmLabel: t('card_unbind'),
    })
    if (!ok) return
    try {
      await unbindCard(card.id)
      setCards(prev => (prev ?? []).filter(c => c.id !== card.id))
    } catch {
      // Не отвязалась (нет сети) — карта остаётся в списке, как и у банка.
      await confirm(t('confirm_error'), { confirmVariant: 'primary', confirmLabel: t('dialog_got_it') })
    }
  }

  return (
    <div class="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <div class="px-4 pt-4 pb-2 flex items-center justify-between">
        <p class="text-xs font-semibold text-gray-400 uppercase tracking-widest">{t('cards_title')}</p>
        <button
          type="button"
          onClick={() => setBinding(true)}
          class="flex items-center gap-1 text-xs font-medium text-green-800 active:opacity-70 transition-opacity"
        >
          <Plus size={14} />
          {t('btn_add')}
        </button>
      </div>
      {cards.length === 0 ? (
        <p class="px-4 pb-4 text-sm text-gray-400">{t('cards_empty')}</p>
      ) : (
        cards.map(card => (
          <div key={card.id} class="flex items-center gap-3 px-4 py-3 border-t border-gray-50">
            <CreditCard size={16} class="text-gray-400 shrink-0" />
            <p class="flex-1 text-sm font-medium text-gray-900 tabular-nums">{cardLabel(card)}</p>
            <button
              type="button"
              onClick={() => remove(card)}
              class="w-8 h-8 flex items-center justify-center rounded-xl text-red-400 active:bg-red-50 transition-colors shrink-0"
            >
              <Trash2 size={15} />
            </button>
          </div>
        ))
      )}
      <BindCardSheet
        open={binding}
        onClose={() => setBinding(false)}
        onBound={card => {
          setBinding(false)
          setCards(prev => [card, ...(prev ?? [])])
        }}
      />
    </div>
  )
}
