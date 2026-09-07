import { useEffect, useState } from 'preact/hooks'
import { refreshTelegramLogin } from './api/auth'
import { apiFetch, ApiError, clearToken } from './api/client'
import { useUser } from './hooks/useUser'
import { LocaleProvider } from './i18n/index'
import { PhoneVerifyScreen } from './screens/PhoneVerifyScreen'
import { HubScreen } from './screens/HubScreen'
import { Spinner } from './components/Spinner'
import { mockConfig, MOCK_ENABLED } from './devMock'
import { normalizeUser } from './types'
import type { User } from './types'

// Dev-симуляция Telegram Mini App: подписанный initData через /__dev/init-data
// и минимальный мок window.Telegram.WebApp. Конфиг — mock-user.json (см. devMock.ts).
if (MOCK_ENABLED) {
  const mockInitDataUnsafe = {
    user: {
      id: mockConfig.telegram_id,
      first_name: mockConfig.first_name,
      last_name: mockConfig.last_name,
      username: mockConfig.username,
      language_code: mockConfig.language_code,
      photo_url: mockConfig.photo_url || undefined,
    },
    start_param: mockConfig.start_param || '',
  }

  const existing = (window as any).Telegram?.WebApp
  if (!existing) {
    ;(window as any).Telegram = {
      WebApp: { initData: '', initDataUnsafe: mockInitDataUnsafe, ready() {}, expand() {} },
    }
  } else if (!existing.initDataUnsafe?.user?.id) {
    // Подключён настоящий telegram-web-app.js, но вне Telegram он отдаёт пустой
    // initDataUnsafe — дописываем мокового пользователя, иначе профиль пуст.
    try {
      existing.initDataUnsafe = mockInitDataUnsafe
    } catch {
      // read-only — игнорируем, авторизация всё равно идёт через подписанный initData
    }
  }
}

const tg = (window as any).Telegram?.WebApp

/** Открыто внутри Telegram: initData подписан, клиента можно опознать без номера. */
const IS_TELEGRAM = MOCK_ENABLED || !!tg?.initData

/**
 * Аноним Mini App: имя и telegram_id из initData, номера ещё нет.
 *
 * По ТЗ такой клиент пользуется приложением свободно и подтверждает номер только
 * при оформлении заказа — до этого момента записи в базе за ним нет.
 */
function anonymousTelegramUser(): User {
  const tgUser = tg?.initDataUnsafe?.user
  return {
    telegram_id: tgUser?.id ?? (MOCK_ENABLED ? mockConfig.telegram_id : 0),
    first_name: tgUser?.first_name ?? '',
    last_name: tgUser?.last_name,
    username: tgUser?.username,
    phone: '',
    language_code: tgUser?.language_code,
  }
}

export function App() {
  const { user, saveUser, clearUser } = useUser()
  const [booting, setBooting] = useState(true)
  const telegramLang = tg?.initDataUnsafe?.user?.language_code

  useEffect(() => {
    try {
      tg?.ready()
      tg?.expand()
    } catch {
      // вне Telegram — игнорируем
    }

    async function init() {
      if (IS_TELEGRAM) {
        try {
          await refreshTelegramLogin()
        } catch (e) {
          console.error('[auth] loginWithTelegram failed:', e)
        }
      }

      // Всегда освежаем профиль с сервера — закэшированный user даёт мгновенный
      // рендер, но мог устареть (имя/телефон менялись в БД).
      try {
        saveUser(normalizeUser(await apiFetch<User>('/clients/me')))
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) clearToken()
        else if (!(e instanceof ApiError && e.status === 404)) console.error(e)

        // 404 в Telegram — клиента ещё нет, работаем анонимно до заказа.
        // Вне Telegram опознать человека без номера нечем — на экран входа.
        if (IS_TELEGRAM) saveUser(anonymousTelegramUser())
        else clearUser()
      }
    }

    init()
      .catch(console.error)
      .finally(() => setBooting(false))
  }, [])

  const startParam: string = tg?.initDataUnsafe?.start_param ?? ''

  return (
    <LocaleProvider telegramLang={telegramLang}>
      {user
        ? <HubScreen user={user} startParam={startParam} onUserUpdated={saveUser} />
        : booting
          ? <div class="min-h-screen bg-white flex items-center justify-center">
              <Spinner size={28} class="border-gray-300" />
            </div>
          : <PhoneVerifyScreen onVerified={saveUser} />
      }
    </LocaleProvider>
  )
}
