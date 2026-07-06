import { useEffect } from 'preact/hooks'
import { refreshTelegramLogin } from './api/auth'
import { apiFetch, ApiError, clearToken } from './api/client'
import { useUser } from './hooks/useUser'
import { LocaleProvider, useLocale } from './i18n/index'
import { RegistrationScreen } from './screens/RegistrationScreen'
import { HubScreen } from './screens/HubScreen'
import { mockConfig, MOCK_ENABLED } from './devMock'
import type { User } from './types'

// Dev-симуляция Telegram Mini App: подписанный initData через /__dev/init-data
// и минимальный мок window.Telegram.WebApp. Конфиг — mock-user.json (см. devMock.ts).
if (MOCK_ENABLED && !(window as any).Telegram) {
  ;(window as any).Telegram = {
    WebApp: {
      initData: '',
      initDataUnsafe: {
        user: {
          id: mockConfig.telegram_id,
          first_name: mockConfig.first_name,
          last_name: mockConfig.last_name,
          username: mockConfig.username,
          language_code: mockConfig.language_code,
          photo_url: mockConfig.photo_url || undefined,
        },
        start_param: mockConfig.start_param || '',
      },
      ready() {},
      expand() {},
    },
  }
}

const tg = (window as any).Telegram?.WebApp

function NotInTelegram() {
  const { t } = useLocale()
  return (
    <div class="h-screen flex flex-col items-center justify-center gap-3 px-8 text-center">
      <p class="text-5xl font-bold" style="color:#44973A">Chaqqon</p>
      <p class="text-lg font-semibold text-gray-800 mt-4">{t('open_in_telegram')}</p>
      <p class="text-sm text-gray-400">{t('open_in_telegram_hint')}</p>
    </div>
  )
}

export function App() {
  const { user, saveUser } = useUser()
  const telegramLang = tg?.initDataUnsafe?.user?.language_code

  useEffect(() => {
    try {
      tg?.ready()
      tg?.expand()
    } catch {
      // вне Telegram — игнорируем
    }

    async function init() {
      if (MOCK_ENABLED || tg?.initData) {
        try {
          await refreshTelegramLogin()
        } catch (e) {
          console.error('[auth] loginWithTelegram failed:', e)
          return
        }
      }

      // Всегда освежаем профиль с сервера — закэшированный user даёт мгновенный
      // рендер, но мог устареть (имя/телефон менялись в БД). На 404 оставляем кэш.
      try {
        const client = await apiFetch<User>('/clients/me')
        saveUser(client)
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) {
          clearToken()
        } else if (!(e instanceof ApiError && e.status === 404)) {
          console.error(e)
        }
      }
    }

    init().catch(console.error)
  }, [])

  async function handleRegister(newUser: User) {
    try {
      const client = await apiFetch<User>('/clients', {
        method: 'POST',
        body: JSON.stringify({
          telegram_id: newUser.telegram_id,
          phone: newUser.phone,
          first_name: newUser.first_name,
          last_name: newUser.last_name,
        }),
      })
      saveUser(client)
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        // Клиент уже существует — берём реальную запись с сервера,
        // а не введённые поля (могут быть неполными/пустыми).
        try {
          const client = await apiFetch<User>('/clients/me')
          saveUser(client)
        } catch {
          saveUser(newUser)
        }
      } else {
        console.error('[register] failed:', e)
      }
    }
  }

  const devTgId = MOCK_ENABLED ? mockConfig.telegram_id : 0
  const hasTelegram = !!(tg?.initData || MOCK_ENABLED)
  const startParam: string = tg?.initDataUnsafe?.start_param ?? ''

  return (
    <LocaleProvider telegramLang={telegramLang}>
      {!hasTelegram
        ? <NotInTelegram />
        : user
          ? <HubScreen user={user} startParam={startParam} />
          : <RegistrationScreen onRegistered={handleRegister} devTelegramId={devTgId} />
      }
    </LocaleProvider>
  )
}
