const BASE_URL = '/api/v1'

const TOKEN_KEY = 'chaqqon_token'

export class ApiError extends Error {
  status: number
  /** Текст из тела ответа `{"detail": "..."}`, если сервер его прислал. */
  detail?: string

  constructor(status: number, message: string, detail?: string) {
    super(message)
    this.status = status
    this.detail = detail
  }
}

export function getToken(): string | null {
  try {
    const raw = localStorage.getItem(TOKEN_KEY)
    if (!raw) return null
    const { token, expiresAt } = JSON.parse(raw) as { token: string; expiresAt: number }
    return Date.now() < expiresAt ? token : null
  } catch {
    return null
  }
}

export function setToken(token: string, expiresInSeconds = 86400) {
  localStorage.setItem(
    TOKEN_KEY,
    JSON.stringify({ token, expiresAt: Date.now() + expiresInSeconds * 1000 }),
  )
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
}

/** Стирает все локальные данные приложения (токен, профиль, тема, язык, черновики). */
export function clearAllUserData() {
  try {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith('chaqqon_')) localStorage.removeItem(key)
    }
  } catch {
    // localStorage недоступен — игнорируем
  }
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken()
  const isFormData = init?.body instanceof FormData

  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
    ...init,
  })

  if (!res.ok) {
    let detail: string | undefined
    try {
      const body = await res.json()
      if (typeof body?.detail === 'string') detail = body.detail
    } catch {
      // тело не JSON или пустое — игнорируем
    }
    throw new ApiError(res.status, `${res.status} ${res.statusText}`, detail)
  }

  return res.json() as Promise<T>
}
