import { Sparkles } from 'lucide-react'
import { useLocale } from '../i18n'

/**
 * Анонс подписки. Заглушка: подписка ещё проектируется (решения в
 * backend/domains/ledger.md, «Подписка»), поэтому баннер только сообщает о
 * ней и никуда не ведёт — это `div`, а не кнопка, без отклика на нажатие.
 */
export function SubscriptionTeaser() {
  const { t } = useLocale()
  return (
    <div class="mx-4 mb-4 rounded-2xl bg-[#1F847B] px-4 py-3.5 flex items-center gap-3 select-none">
      <div class="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0" style="color:white">
        <Sparkles size={20} />
      </div>
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2">
          <p class="text-sm font-bold text-white leading-tight">{t('subscription_teaser_title')}</p>
          <span class="text-[10px] font-semibold uppercase tracking-wide text-white bg-white/20 rounded-full px-2 py-0.5 shrink-0">
            {t('subscription_teaser_badge')}
          </span>
        </div>
        <p class="text-xs text-white/70 mt-1 leading-snug">{t('subscription_teaser_text')}</p>
      </div>
    </div>
  )
}
