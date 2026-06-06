import { useEffect } from 'preact/hooks'
import { loginWithTelegram, loginWithServiceKey } from './api/auth'
import { apiFetch, ApiError, clearToken } from './api/client'
import { useUser } from './hooks/useUser'
import { LocaleProvider } from './i18n/index'
import { RegistrationScreen } from './screens/RegistrationScreen'
import { HubScreen } from './screens/HubScreen'
import type { User } from './types'

const tg = (window as any).Telegram?.WebApp

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
      const initData: string = tg?.initData ?? ''
      const devTgId = Number(import.meta.env.VITE_DEV_TG_ID)

      if (initData) {
        try {
          await loginWithTelegram(initData)
        } catch (e) {
          console.error('[auth] loginWithTelegram failed:', e)
          return
        }
      } else if (import.meta.env.DEV && devTgId) {
        try {
          await loginWithServiceKey(devTgId)
        } catch (e) {
          console.error('[auth] loginWithServiceKey failed:', e)
        }
      }

      if (user) return

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
        saveUser(newUser)
      } else {
        console.error('[register] failed:', e)
      }
    }
  }

  const devTgId = import.meta.env.DEV ? Number(import.meta.env.VITE_DEV_TG_ID) || 0 : 0

  return (
    <LocaleProvider telegramLang={telegramLang}>
      {user
        ? <HubScreen user={user} />
        : <RegistrationScreen onRegistered={handleRegister} devTelegramId={devTgId} />
      }
    </LocaleProvider>
  )
}
