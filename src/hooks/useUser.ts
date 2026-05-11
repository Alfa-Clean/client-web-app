import { useState } from 'preact/hooks'
import type { User } from '../types'

const STORAGE_KEY = 'alfaclean_user'

function getStoredUser(): User | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as User) : null
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

  return { user, saveUser }
}
