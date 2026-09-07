import { useLocale } from '../i18n'
import { Logo } from '../components/Logo'
import { PhoneVerifyForm } from '../components/PhoneVerifyForm'
import type { User } from '../types'

interface Props {
  onVerified: (client: User) => void | Promise<void>
}

/**
 * Вход по номеру телефона — первый экран вне Telegram.
 *
 * В Mini App этого экрана нет: там клиент опознаётся по подписанному initData и
 * остаётся анонимным до оформления заказа, где номер спрашивает шторка в мастере.
 */
export function PhoneVerifyScreen({ onVerified }: Props) {
  const { t } = useLocale()

  return (
    <div class="min-h-screen bg-white flex flex-col px-6">
      <div class="flex-1 flex flex-col items-center justify-center gap-2">
        <Logo class="h-12" />
        <p class="text-xs font-semibold uppercase tracking-widest text-gray-400">
          {t('reg_tagline')}
        </p>
      </div>

      <div class="pb-12">
        <PhoneVerifyForm onVerified={onVerified} />
      </div>
    </div>
  )
}
