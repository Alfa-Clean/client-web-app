import { useEffect } from 'preact/hooks'
import { loginWithTelegram } from './api/auth'
import { apiFetch, ApiError, clearToken } from './api/client'
import { useUser } from './hooks/useUser'
import { LocaleProvider } from './i18n/index'
import { RegistrationScreen } from './screens/RegistrationScreen'
import { HomeScreen } from './screens/HomeScreen'
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
      console.log('[init] initData present:', !!initData)
      if (initData) {
        try {
          await loginWithTelegram(initData)
          console.log('[init] token after login:', localStorage.getItem('alfaclean_token'))
        } catch (e) {
          console.error('[auth] loginWithTelegram failed:', e)
          return
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
        console.error(e)
        saveUser(newUser)
      }
    }
  }

  return (
    <LocaleProvider telegramLang={telegramLang}>
      {user
        ? <HomeScreen user={user} />
        : <RegistrationScreen onRegistered={handleRegister} />
      }
    </LocaleProvider>
  )
}
