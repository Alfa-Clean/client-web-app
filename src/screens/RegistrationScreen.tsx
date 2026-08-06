import { useState } from 'preact/hooks'
import type { User } from '../types'
import { useLocale } from '../i18n'
import { Logo } from '../components/Logo'
import { Spinner } from '../components/Spinner'

interface Props {
  onRegistered: (user: User) => void | Promise<void>
  devTelegramId?: number
}

type Status = 'idle' | 'loading' | 'error'

export function RegistrationScreen({ onRegistered, devTelegramId = 0 }: Props) {
  // Читаем внутри компонента: к моменту рендера мок window.Telegram уже установлен.
  const tg = (window as any).Telegram?.WebApp
  const [status, setStatus] = useState<Status>('idle')
  const [tgMajor, tgMinor] = ((tg?.version ?? '0.0') as string).split('.').map(Number)
  const canRequestContact = tgMajor > 6 || (tgMajor === 6 && tgMinor >= 9)
  const [showManual, setShowManual] = useState(!canRequestContact)
  const [manualPhone, setManualPhone] = useState('')
  const tgUser = tg?.initDataUnsafe?.user
  const { t } = useLocale()

  function buildUser(phone: string): User {
    return {
      telegram_id: tgUser?.id ?? devTelegramId,
      first_name: tgUser?.first_name ?? '',
      last_name: tgUser?.last_name,
      username: tgUser?.username,
      phone,
      language_code: tgUser?.language_code,
    }
  }

  // Держим 'loading' до размонтирования экрана: регистрация может занять
  // заметное время, кнопка не должна «отпускаться» раньше.
  async function submit(phone: string) {
    setStatus('loading')
    try {
      await onRegistered(buildUser(phone))
    } catch {
      setStatus('error')
    }
  }

  function handleSharePhone() {
    try {
      setStatus('loading')
      tg?.requestContact((granted: boolean, response: any) => {
        if (!granted || !response || response.status !== 'sent') {
          setStatus('idle')
          setShowManual(true)
          return
        }
        submit(response.responseUnsafe.contact.phone_number)
      })
    } catch {
      setStatus('idle')
      setShowManual(true)
    }
  }

  function handleManualSubmit() {
    const phone = manualPhone.trim()
    if (!phone) return
    submit(phone)
  }

  const firstName = tgUser?.first_name

  return (
    <div class="h-screen bg-white flex flex-col px-6">
      {/* Top: wordmark */}
      <div class="flex-1 flex flex-col items-center justify-center gap-2">
        <Logo class="h-12" />
        <p class="text-xs font-semibold uppercase tracking-widest text-gray-400">
          {t('reg_tagline')}
        </p>
      </div>

      {/* Bottom: greeting + actions */}
      <div class="pb-12 flex flex-col gap-4">
        <div class="mb-2">
          <h2 class="text-2xl font-bold text-gray-900">
            {firstName ? t('reg_hello', { name: firstName }) : t('reg_welcome')}
          </h2>
          <p class="text-sm text-gray-400 mt-1 leading-relaxed">
            {t('reg_phone_request')}
          </p>
        </div>

        {!showManual ? (
          <button
            type="button"
            onClick={handleSharePhone}
            disabled={status === 'loading'}
            class="w-full flex items-center justify-center gap-2 text-white font-semibold py-4 px-6 rounded-2xl transition-colors text-base disabled:opacity-50"
            style="background:#1F847B"
          >
            {status === 'loading' && <Spinner size={18} class="border-white" />}
            {status === 'loading' ? t('reg_loading') : t('reg_share_phone')}
          </button>
        ) : (
          <>
            <input
              type="tel"
              value={manualPhone}
              onInput={e => setManualPhone((e.target as HTMLInputElement).value)}
              placeholder="+998 90 123 45 67"
              class="w-full bg-white border border-gray-200 rounded-2xl px-4 py-3.5 text-sm text-gray-900 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-[#1F847B] transition-colors"
            />
            <button
              type="button"
              onClick={handleManualSubmit}
              disabled={!manualPhone.trim() || status === 'loading'}
              class="w-full flex items-center justify-center gap-2 text-white font-semibold py-4 px-6 rounded-2xl transition-colors disabled:opacity-50"
              style="background:#1F847B"
            >
              {status === 'loading' && <Spinner size={18} class="border-white" />}
              {status === 'loading' ? t('reg_loading') : t('btn_continue')}
            </button>
            <button
              type="button"
              onClick={() => setShowManual(false)}
              class="text-sm text-gray-400 text-center transition-colors"
            >
              ← {t('reg_share_phone')}
            </button>
          </>
        )}

        {!showManual && (
          <button
            type="button"
            onClick={() => setShowManual(true)}
            class="text-sm text-gray-400 text-center transition-colors"
          >
            {t('reg_enter_manually')}
          </button>
        )}

        {status === 'error' && (
          <p class="text-red-500 text-sm text-center">{t('reg_phone_error')}</p>
        )}
      </div>
    </div>
  )
}
