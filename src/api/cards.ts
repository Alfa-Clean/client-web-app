import { apiFetch } from './client'

/**
 * Привязанные карты клиента. Баланса в приложении у клиента нет — деньги на
 * карте, заказ оплачивается холдом (замораживается при оформлении,
 * списывается после работы, при отмене возвращается целиком).
 *
 * Номер карты к нам не попадает: бэкенд хранит токен банка и маску. На бете
 * банк — эмуляция, карта привязывается тестовым номером.
 */
export interface Card {
  id: string
  brand: string
  pan_mask: string
  is_active: boolean
  created_at: string
  /** Только у карт тестового банка на бете — **эмуляция** для проверки оплат.
   *  У настоящего банка остатка карты мы не знаем, полей нет. */
  mock_balance?: number
  mock_available?: number
}

export const BRAND_LABELS: Record<string, string> = {
  uzcard: 'Uzcard',
  humo: 'Humo',
  visa: 'Visa',
  mastercard: 'Mastercard',
}

export function cardLabel(card: Pick<Card, 'brand' | 'pan_mask'>): string {
  return `${BRAND_LABELS[card.brand] ?? card.brand} ·· ${card.pan_mask.slice(-4)}`
}

export function listCards(): Promise<Card[]> {
  return apiFetch<Card[]>('/me/cards')
}

export function bindCard(cardNumber: string): Promise<Card> {
  return apiFetch<Card>('/me/cards', {
    method: 'POST',
    body: JSON.stringify({ card_number: cardNumber }),
  })
}

export function unbindCard(cardId: string): Promise<void> {
  return apiFetch<void>(`/me/cards/${cardId}`, { method: 'DELETE' })
}

/** Тестовые номера мок-банка — показываются на бете при привязке. */
export const TEST_CARD_NUMBERS = [
  '8600 0000 0000 0001',
  '4111 1111 1111 1111',
]
