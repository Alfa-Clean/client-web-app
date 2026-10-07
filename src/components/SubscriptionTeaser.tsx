import { useLocale } from '../i18n'
import banner from '../assets/banners/subscription.webp'

/**
 * Анонс подписки. Открывает paywall (`SubscriptionScreen`): выбор адреса и
 * цена по числу комнат. Оплаты подписки на бете нет — бейдж «Скоро» про неё.
 *
 * Картинка — фон без текста: слева однотонный бирюзовый, справа иллюстрация.
 * Она растянута по высоте и прижата вправо, так что на узком экране срезается
 * однотонный левый край, а не люди. Текст — из переводов, поверх левой части:
 * узбекский длиннее и запечённым в картинку стал бы нечитаемо мелким.
 */
export function SubscriptionTeaser({ onClick }: { onClick: () => void }) {
  const { t } = useLocale()
  return (
    <button
      type="button"
      onClick={onClick}
      class="block w-[calc(100%-2rem)] mx-4 mb-4 h-[104px] rounded-2xl overflow-hidden bg-[#1A8075] bg-no-repeat select-none text-left active:opacity-90 transition-opacity"
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
      <span class="h-full w-[calc(100%-166px)] max-[374px]:w-[calc(100%-158px)] pl-4 flex flex-col justify-center">
        <span class="flex flex-wrap items-center gap-x-2 max-[374px]:gap-x-1.5 gap-y-1">
          <span class="block text-[15px] max-[374px]:text-[13px] font-bold text-white leading-tight">{t('subscription_teaser_title')}</span>
          <span class="text-[9px] max-[374px]:text-[8px] font-semibold uppercase tracking-wide text-white bg-white/20 rounded-full px-2 max-[374px]:px-1.5 py-0.5 shrink-0">
            {t('subscription_teaser_badge')}
          </span>
        </span>
        <span class="block text-[11px] max-[374px]:text-[10px] text-white/85 mt-1 max-[374px]:mt-0.5 leading-snug">{t('subscription_teaser_text')}</span>
      </span>
    </button>
  )
}
