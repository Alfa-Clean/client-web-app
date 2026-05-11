import WebApp from '@twa-dev/sdk'
import { useState } from 'preact/hooks'
import type { User } from '../types'
import { useLocale } from '../i18n'

interface Props {
  onRegistered: (user: User) => void
}

type Status = 'idle' | 'loading' | 'error'

export function RegistrationScreen({ onRegistered }: Props) {
  const [status, setStatus] = useState<Status>('idle')
  const tgUser = WebApp.initDataUnsafe?.user
  const { t } = useLocale()

  function handleSharePhone() {
    setStatus('loading')

    // TODO: УДАЛИТЬ ЗАГЛУШКУ ПЕРЕД КОММИТОМ
    if (!WebApp.initData) {
      onRegistered({
        telegram_id: 515588435, // TODO: УДАЛИТЬ ЗАГЛУШКУ ПЕРЕД КОММИТОМ
        first_name: 'Тест',
        phone: '+998901234567',
      })
      return
    }

    WebApp.requestContact((granted, response) => {
      if (!granted || !response || response.status !== 'sent') {
        setStatus('error')
        return
      }

      const contact = response.responseUnsafe.contact

      const user: User = {
        telegram_id: tgUser?.id ?? 0,
        first_name: tgUser?.first_name ?? contact.first_name ?? '',
        last_name: tgUser?.last_name,
        username: tgUser?.username,
        phone: contact.phone_number,
        language_code: tgUser?.language_code,
      }

      onRegistered(user)
    })
  }

  return (
    <div class="min-h-screen bg-white flex flex-col items-center justify-center px-6">
      <div class="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mb-6">
        <span class="text-3xl">🧹</span>
      </div>

      <h1 class="text-2xl font-semibold text-gray-900 text-center mb-2">
        AlfaClean
      </h1>

      {tgUser?.first_name && (
        <p class="text-gray-500 text-center mb-8">
          {t('reg_hello', { name: tgUser.first_name })}
        </p>
      )}

      <p class="text-gray-500 text-sm text-center mb-8 leading-relaxed">
        {t('reg_phone_request')}
      </p>

      <button
        type="button"
        onClick={handleSharePhone}
        disabled={status === 'loading'}
        class="w-full max-w-xs bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-3.5 px-6 rounded-xl transition-colors"
      >
        {status === 'loading' ? t('reg_loading') : t('reg_share_phone')}
      </button>

      {status === 'error' && (
        <p class="text-red-500 text-sm text-center mt-4">
          {t('reg_phone_error')}
        </p>
      )}
    </div>
  )
}
