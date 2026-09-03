export interface User {
  /** UUID клиента в базе. Нет у анонима Mini App — он ещё не заведён. */
  id?: string
  /** 0 — вход по номеру телефона, без Telegram. */
  telegram_id: number
  first_name: string
  last_name?: string
  username?: string
  /** Пустая строка — номер ещё не подтверждён, заказ оформить нельзя. */
  phone: string
  language_code?: string
}

/**
 * Профиль с бэкенда → профиль приложения.
 *
 * `telegram_id` в базе nullable (клиент из manual-заказа или вход по номеру),
 * а весь фронт передаёт его в API числом — поэтому отсутствие превращаем в 0,
 * а не тянем `| null` через все экраны.
 */
export function normalizeUser(raw: Partial<User>): User {
  return {
    ...raw,
    telegram_id: Number(raw.telegram_id) || 0,
    first_name: raw.first_name ?? '',
    phone: raw.phone ?? '',
  }
}
