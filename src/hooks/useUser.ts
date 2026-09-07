import { useState } from 'preact/hooks'
import type { User } from '../types'

const STORAGE_KEY = 'chaqqon_user'

function getStoredUser(): User | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const u = raw ? (JSON.parse(raw) as User) : null
    // Аноним Mini App опознаётся по telegram_id, клиент из браузера — по id.
    return u && (u.telegram_id || u.id) ? u : null
  } catch {
    return null
  }
}

export function useUser() {
  const [user, setUser] = useState<User | null>(getStoredUser)

  function saveUser(newUser: User) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newUser))
    setUser(newUser)
  }

  function clearUser() {
    localStorage.removeItem(STORAGE_KEY)
    setUser(null)
  }

  return { user, saveUser, clearUser }
}
