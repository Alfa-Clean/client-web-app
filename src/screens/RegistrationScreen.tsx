import { useState } from 'preact/hooks'
import type { User } from '../types'
import { useLocale } from '../i18n'

const tg = (window as any).Telegram?.WebApp

interface Props {
  onRegistered: (user: User) => void
}

type Status = 'idle' | 'loading' | 'error'

export function RegistrationScreen({ onRegistered }: Props) {
  const [status, setStatus] = useState<Status>('idle')
  const [tgMajor, tgMinor] = ((tg?.version ?? '0.0') as string).split('.').map(Number)
  const canRequestContact = tgMajor > 6 || (tgMajor === 6 && tgMinor >= 9)
  const [showManual, setShowManual] = useState(!canRequestContact)
  const [manualPhone, setManualPhone] = useState('')
  const tgUser = tg?.initDataUnsafe?.user
  const { t } = useLocale()

  function buildUser(phone: string): User {
    return {
      telegram_id: tgUser?.id ?? 0,
      first_name: tgUser?.first_name ?? '',
      last_name: tgUser?.last_name,
      username: tgUser?.username,
      phone,
      language_code: tgUser?.language_code,
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
        onRegistered(buildUser(response.responseUnsafe.contact.phone_number))
      })
    } catch {
      setStatus('idle')
      setShowManual(true)
    }
  }

  function handleManualSubmit() {
    const phone = manualPhone.trim()
    if (!phone) return
    onRegistered(buildUser(phone))
  }

  return (
    <div class="h-screen bg-white flex flex-col items-center justify-center px-6">
      <div class="w-20 h-20 rounded-3xl bg-blue-50 flex items-center justify-center mb-6">
        <span class="text-4xl">🧹</span>
      </div>

      <h1 class="text-2xl font-bold text-gray-900 text-center mb-2">
        AlfaClean
      </h1>

      {tgUser?.first_name && (
        <p class="text-lg font-medium text-gray-800 text-center mb-1">
          {t('reg_hello', { name: tgUser.first_name })}
        </p>
      )}

      <p class="text-gray-500 text-sm text-center mb-10 leading-relaxed">
        {t('reg_phone_request')}
      </p>

      {!showManual ? (
        <>
          <button
            type="button"
            onClick={handleSharePhone}
            disabled={status === 'loading'}
            class="w-full max-w-xs bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-4 px-6 rounded-2xl transition-colors text-base"
          >
            {status === 'loading' ? t('reg_loading') : `📱 ${t('reg_share_phone')}`}
          </button>

        </>
      ) : (
        <div class="w-full max-w-xs flex flex-col gap-3">
          <input
            type="tel"
            value={manualPhone}
            onInput={e => setManualPhone((e.target as HTMLInputElement).value)}
            placeholder="+998 90 123 45 67"
            class="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500"
          />
          <button
            type="button"
            onClick={handleManualSubmit}
            disabled={!manualPhone.trim()}
            class="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-4 px-6 rounded-2xl transition-colors"
          >
            {t('btn_continue')}
          </button>
          <button
            type="button"
            onClick={() => setShowManual(false)}
            class="text-sm text-gray-400 hover:text-gray-600 text-center transition-colors"
          >
            ← {t('reg_share_phone')}
          </button>
        </div>
      )}

      {status === 'error' && (
        <p class="text-red-500 text-sm text-center mt-4">
          {t('reg_phone_error')}
        </p>
      )}
    </div>
  )
}
