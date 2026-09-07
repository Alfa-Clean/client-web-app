const BASE_URL = '/api/v1'

const TOKEN_KEY = 'chaqqon_token'

export class ApiError extends Error {
  status: number
  /** Текст из тела ответа `{"detail": "..."}`, если сервер его прислал. */
  detail?: string
  /**
   * Разобранное тело ответа целиком. У части ручек (OTP) `detail` — объект
   * `{ reason, ... }`, а не строка: по HTTP-статусу их не различить.
   */
  body?: unknown

  constructor(status: number, message: string, detail?: string, body?: unknown) {
    super(message)
    this.status = status
    this.detail = detail
    this.body = body
  }

  /** Машиночитаемая причина отказа — `detail.reason`, если сервер её прислал. */
  get reason(): string | undefined {
    const detail = (this.body as { detail?: unknown } | undefined)?.detail
    const reason = (detail as { reason?: unknown } | undefined)?.reason
    return typeof reason === 'string' ? reason : undefined
  }

  /** Остальные поля из `detail` — `retry_after`, `attempts_left` и подобные. */
  get context(): Record<string, unknown> {
    const detail = (this.body as { detail?: unknown } | undefined)?.detail
    return detail && typeof detail === 'object' ? (detail as Record<string, unknown>) : {}
  }
}

/**
 * Бэкенд недоступен: запрос не дошёл (нет сети, воркер не достучался до API)
 * либо прокси ответил ошибкой шлюза. Отличается от `ApiError` тем, что сервер
 * ничего не решал — повторять запрос имеет смысл, менять ввод бесполезно.
 */
export class NetworkError extends Error {
  constructor(message = 'Backend unreachable') {
    super(message)
    this.name = 'NetworkError'
  }
}

/** Ответы прокси, означающие «до бэкенда не достучались», а не отказ бэкенда. */
const GATEWAY_STATUSES = new Set([502, 503, 504])

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

  let res: Response
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      headers: {
        ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init?.headers,
      },
      ...init,
    })
  } catch (e) {
    throw new NetworkError(e instanceof Error ? e.message : undefined)
  }

  if (GATEWAY_STATUSES.has(res.status)) {
    throw new NetworkError(`${res.status} ${res.statusText}`)
  }

  if (!res.ok) {
    let detail: string | undefined
    let body: unknown
    try {
      body = await res.json()
      const raw = (body as { detail?: unknown })?.detail
      if (typeof raw === 'string') detail = raw
    } catch {
      // тело не JSON или пустое — игнорируем
    }
    throw new ApiError(res.status, `${res.status} ${res.statusText}`, detail, body)
  }

  return res.json() as Promise<T>
}
