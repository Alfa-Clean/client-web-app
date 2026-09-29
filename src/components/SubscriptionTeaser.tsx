import { useLocale } from '../i18n'
import banner from '../assets/banners/subscription.webp'

/**
 * Анонс подписки. Заглушка: подписка ещё проектируется (решения в
 * backend/domains/ledger.md, «Подписка»), поэтому баннер только сообщает о
 * ней и никуда не ведёт — это `div`, а не кнопка, без отклика на нажатие.
 *
 * Картинка — фон без текста: слева однотонный бирюзовый, справа иллюстрация.
 * Она растянута по высоте и прижата вправо, так что на узком экране срезается
 * однотонный левый край, а не люди. Текст — из переводов, поверх левой части:
 * узбекский длиннее и запечённым в картинку стал бы нечитаемо мелким.
 */
export function SubscriptionTeaser() {
  const { t } = useLocale()
  return (
    <div
      class="mx-4 mb-4 h-[104px] rounded-2xl overflow-hidden bg-[#1A8075] bg-no-repeat select-none"
      style={{
        backgroundImage: `url(${banner})`,
        backgroundSize: 'auto 100%',
        // Справа у картинки ~47 px пустого поля — уводим его за край,
        // чтобы люди заняли меньше ширины и тексту осталось место.
        backgroundPosition: 'right -36px center',
      }}
    >
      {/* 166 px — ширина иллюстрации после сдвига плюс зазор, текст на неё не
          заходит. Уже 375 px текст мельче: иначе узбекский не влезает по высоте,
          а «Subscription» сталкивает бейдж на отдельную строку. */}
      <div class="h-full w-[calc(100%-166px)] max-[374px]:w-[calc(100%-158px)] pl-4 flex flex-col justify-center">
        <div class="flex flex-wrap items-center gap-x-2 max-[374px]:gap-x-1.5 gap-y-1">
          <p class="text-[15px] max-[374px]:text-[13px] font-bold text-white leading-tight">{t('subscription_teaser_title')}</p>
          <span class="text-[9px] max-[374px]:text-[8px] font-semibold uppercase tracking-wide text-white bg-white/20 rounded-full px-2 max-[374px]:px-1.5 py-0.5 shrink-0">
            {t('subscription_teaser_badge')}
          </span>
        </div>
        <p class="text-[11px] max-[374px]:text-[10px] text-white/85 mt-1 max-[374px]:mt-0.5 leading-snug">{t('subscription_teaser_text')}</p>
      </div>
    </div>
  )
}
