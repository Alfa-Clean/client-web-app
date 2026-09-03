/**
 * Подтверждение номера телефона кодом.
 *
 * Две ручки бэкенда: запросить код и ввести код. Вторая обслуживает оба входа —
 * в Mini App токен уже есть (номер привязывается к текущему клиенту), в браузере
 * его нет (успешный код и есть вход), и в обоих случаях возвращает свежий JWT.
 */

import { apiFetch, setToken } from './client'
import type { Lang } from '../i18n/locales'
import type { User } from '../types'

/** Номер в том виде, в каком его принимает бэкенд: `998` и 9 цифр, без плюса. */
export const PHONE_PREFIX = '998'
export const PHONE_DIGITS = 9
export const CODE_LENGTH = 6

export interface OtpRequestResponse {
  sent: boolean
  /** Секунды до того, как можно запросить код повторно. */
  retry_after: number
  /** Сколько живёт код. */
  expires_in: number
}

export interface OtpVerifyResponse {
  access_token: string
  token_type: string
  client: User
  /** Сколько заказов диспетчера привязалось к клиенту по номеру. */
  claimed_orders: number
}

/** Национальная часть номера («901234567») → формат бэкенда («998901234567»). */
export function toApiPhone(nationalDigits: string): string {
  return PHONE_PREFIX + nationalDigits
}

/** «901234567» → «90 123 45 67». Ввод, который короче, форматируется по мере набора. */
export function formatNationalPhone(digits: string): string {
  const d = digits.slice(0, PHONE_DIGITS)
  const parts = [d.slice(0, 2), d.slice(2, 5), d.slice(5, 7), d.slice(7, 9)]
  return parts.filter(Boolean).join(' ')
}

/** Оставляет только цифры и отбрасывает код страны, если человек ввёл его вручную. */
export function normalizePhoneInput(raw: string): string {
  let digits = raw.replace(/\D/g, '')
  if (digits.startsWith(PHONE_PREFIX)) digits = digits.slice(PHONE_PREFIX.length)
  return digits.slice(0, PHONE_DIGITS)
}

export function isCompletePhone(digits: string): boolean {
  return digits.length === PHONE_DIGITS
}

export function requestOtp(phone: string, language: Lang): Promise<OtpRequestResponse> {
  return apiFetch<OtpRequestResponse>('/auth/otp/request', {
    method: 'POST',
    body: JSON.stringify({ phone, language }),
  })
}

/**
 * Проверяет код и сохраняет выданный токен: дальше все запросы идут уже от
 * подтверждённого клиента, в том числе в браузере, где до этого токена не было.
 *
 * Вместе с кодом уходит имя из `initData` — профиль клиента заводится именно
 * этой ручкой, а имени, кроме как в подписанных данных Telegram, взять негде.
 * Вне Telegram имени нет, и профиль остаётся с одним телефоном (так в ТЗ).
 */
export async function verifyOtp(phone: string, code: string): Promise<OtpVerifyResponse> {
  const tgUser = (window as any).Telegram?.WebApp?.initDataUnsafe?.user
  const res = await apiFetch<OtpVerifyResponse>('/auth/otp/verify', {
    method: 'POST',
    body: JSON.stringify({
      phone,
      code,
      ...(tgUser?.first_name && { first_name: tgUser.first_name }),
      ...(tgUser?.last_name && { last_name: tgUser.last_name }),
    }),
  })
  setToken(res.access_token)
  return res
}
