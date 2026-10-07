import { Zap } from 'lucide-react'
import { useLocale } from '../i18n'

interface Props {
  value: boolean
  onChange: (next: boolean) => void
  /**
   * Подпись под заголовком. По умолчанию — наценка; у дома наценки нет (цену
   * согласует бригадир), и экран передаёт свою подпись.
   */
  note?: string
}

/**
 * Флажок «Срочный заказ». Дату и слот не меняет: срочность — плашка у
 * исполнителя и наценка, которую считает сервер (модификатор `urgent` в
 * тарифах). Сумму наценки показывает разбивка стоимости, а не этот блок.
 */
export function UrgentToggle({ value, onChange, note }: Props) {
  const { t } = useLocale()
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      onClick={() => onChange(!value)}
      class={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl border-2 text-left transition-colors ${
        value ? 'border-amber-400 bg-amber-50' : 'border-gray-100 bg-white active:bg-gray-50'
      }`}
    >
      <span
        class={`w-9 h-9 shrink-0 rounded-full flex items-center justify-center ${
          value ? 'bg-amber-400 text-white' : 'bg-gray-100 text-gray-400'
        }`}
      >
        <Zap size={18} fill={value ? 'currentColor' : 'none'} />
      </span>
      <span class="flex-1 min-w-0">
        <span class="block text-sm font-semibold text-gray-900">{t('urgent_title')}</span>
        <span class="block text-xs text-gray-500 mt-0.5">{note ?? t('urgent_note')}</span>
      </span>
      <span
        class={`relative w-11 h-6 shrink-0 rounded-full transition-colors ${
          value ? 'bg-amber-400' : 'bg-gray-200'
        }`}
      >
        <span
          class={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
            value ? 'translate-x-5' : ''
          }`}
        />
      </span>
    </button>
  )
}
