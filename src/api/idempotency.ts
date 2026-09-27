/**
 * Ключ идемпотентности для запросов, которые что-то создают (заказ).
 *
 * Защищает от дубля при двойном нажатии, ретрае после таймаута сети и
 * повторной отправке после того, как Telegram закрыл WebView посреди запроса.
 * Бэкенд помнит ключ сутки: повтор с тем же ключом возвращает первый заказ,
 * а не создаёт второй (`Idempotency-Replayed: true`).
 *
 * Ключ — это **намерение**, а не нажатие: один на заказ, который собирается
 * оформить клиент. Пока тело запроса то же — ключ тот же, даже после ошибки
 * и перезапуска приложения. Изменил заказ — новый ключ: тот же ключ с другим
 * телом бэкенд отвергает (422 `idempotency_key_reused`).
 */

import { ApiError } from './client'

/** UUID v4. `crypto.randomUUID` есть не во всех WebView Telegram (старый iOS). */
export function newIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

interface StoredIntent {
  key: string
  body: string
}

/**
 * Ключ намерения, привязанный к телу запроса и сохранённый в localStorage.
 *
 * `keyFor(body)` отдаёт прежний ключ, если тело не изменилось, иначе —
 * новый. `reset()` — после успешного создания: следующий заказ — новое
 * намерение.
 */
export class IntentKey {
  private readonly storageKey: string

  constructor(storageKey: string) {
    this.storageKey = storageKey
  }

  keyFor(body: unknown): string {
    const serialized = JSON.stringify(body)
    const stored = this.read()
    if (stored && stored.body === serialized) return stored.key
    const key = newIdempotencyKey()
    this.write({ key, body: serialized })
    return key
  }

  reset() {
    try {
      localStorage.removeItem(this.storageKey)
    } catch {
      // localStorage недоступен — ключ жил бы только до перезапуска
    }
  }

  private read(): StoredIntent | null {
    try {
      const raw = localStorage.getItem(this.storageKey)
      return raw ? (JSON.parse(raw) as StoredIntent) : null
    } catch {
      return null
    }
  }

  private write(intent: StoredIntent) {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(intent))
    } catch {
      // см. reset()
    }
  }
}

/** Ключи намерений форм заказа. Префикс `chaqqon_` — их стирает выход. */
export const orderIntent = new IntentKey('chaqqon_order_intent')
export const handymanOrderIntent = new IntentKey('chaqqon_handyman_order_intent')

const IN_PROGRESS_RETRIES = 6
const IN_PROGRESS_DELAY_MS = 1000

/**
 * Выполнить запрос с ключом; на 409 `request_in_progress` — подождать и
 * повторить с тем же ключом.
 *
 * 409 значит «первая попытка с этим ключом ещё идёт» (например, первый
 * запрос ушёл, ответ потерялся, клиент нажал снова). Когда она закончится,
 * повтор получит её результат. Ретрай безопасен именно потому, что ключ тот
 * же — второй заказ не создастся.
 */
export async function withInProgressRetry<T>(send: () => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await send()
    } catch (e) {
      const inProgress = e instanceof ApiError && e.status === 409 && e.reason === 'request_in_progress'
      if (!inProgress || attempt >= IN_PROGRESS_RETRIES) throw e
      await new Promise((resolve) => setTimeout(resolve, IN_PROGRESS_DELAY_MS * (attempt + 1)))
    }
  }
}
