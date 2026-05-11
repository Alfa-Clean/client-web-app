import WebApp from '@twa-dev/sdk'
import { useEffect } from 'preact/hooks'
import { loginWithTelegram } from './api/auth'
import { getToken } from './api/client'
import { useUser } from './hooks/useUser'
import { LocaleProvider } from './i18n/index'
import { RegistrationScreen } from './screens/RegistrationScreen'
import { HomeScreen } from './screens/HomeScreen'

export function App() {
  const { user, saveUser } = useUser()
  const telegramLang = WebApp.initDataUnsafe?.user?.language_code

  useEffect(() => {
    try {
      WebApp.ready()
      WebApp.expand()
    } catch {
      // вне Telegram — игнорируем
    }

    const initData = WebApp.initData
    if (initData && !getToken()) {
      loginWithTelegram(initData).catch(console.error)
    }
  }, [])

  return (
    <LocaleProvider telegramLang={telegramLang}>
      {user
        ? <HomeScreen user={user} />
        : <RegistrationScreen onRegistered={saveUser} />
      }
    </LocaleProvider>
  )
}
