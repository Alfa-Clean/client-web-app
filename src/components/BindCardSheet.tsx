import { useState } from 'preact/hooks'
import { BottomSheet } from './BottomSheet'
import { useLocale } from '../i18n'
import { ApiError } from '../api/client'
import { bindCard, TEST_CARD_NUMBERS, type Card } from '../api/cards'

interface Props {
  open: boolean
  onClose: () => void
  onBound: (card: Card) => void
}

/**
 * Привязка карты. На бете банк — эмуляция: карта привязывается тестовым
 * номером, деньги не списываются. С настоящим банком здесь будет его страница
 * ввода карты — номер к нам не попадает.
 */
export function BindCardSheet({ open, onClose, onBound }: Props) {
  const { t } = useLocale()
  const [number, setNumber] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const digits = number.replace(/\D/g, '')

  function format(value: string) {
    return value.replace(/\D/g, '').slice(0, 16).replace(/(\d{4})(?=\d)/g, '$1 ')
  }

  async function submit() {
    setSaving(true)
    setError(null)
    try {
      const card = await bindCard(digits)
      setNumber('')
      onBound(card)
    } catch (e) {
      const message = e instanceof ApiError ? e.context.message : null
      setError(typeof message === 'string' ? message : t('confirm_error'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <BottomSheet open={open} onClose={onClose}>
      <div class="px-5 pb-6 pt-2 flex flex-col gap-4">
        <p class="text-base font-semibold text-gray-900">{t('card_bind_title')}</p>
        <label class="flex flex-col gap-1.5">
          <span class="text-xs text-gray-400">{t('card_number_label')}</span>
          <input
            inputMode="numeric"
            autoComplete="cc-number"
            value={number}
            onInput={e => setNumber(format((e.target as HTMLInputElement).value))}
            placeholder="0000 0000 0000 0000"
            class="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 focus:border-[#1F847B] outline-none text-base tracking-wider tabular-nums"
          />
        </label>
        <p class="text-xs text-gray-400 leading-relaxed">
          {t('card_bind_beta', { cards: TEST_CARD_NUMBERS.join(', ') })}
        </p>
        {error && <p class="text-sm text-red-500">{error}</p>}
        <button
          type="button"
          onClick={submit}
          disabled={digits.length < 12 || saving}
          class="w-full py-4 rounded-2xl text-sm font-semibold text-white disabled:opacity-40"
          style="background:#1F847B"
        >
          {saving ? t('confirm_submitting') : t('card_bind_submit')}
        </button>
      </div>
    </BottomSheet>
  )
}
