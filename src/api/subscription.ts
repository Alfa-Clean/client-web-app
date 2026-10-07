import { apiFetch } from './client'

/**
 * Почему у адреса нет цены подписки. Цену в этих случаях назначает человек —
 * экран предлагает связаться с поддержкой (кроме `address_incomplete`).
 *  - `house` — частный дом;
 *  - `on_request` — для этого числа комнат тарифа нет (5+);
 *  - `config_over_limit` — старый адрес с 10 комнатами или 4+ санузлами;
 *  - `address_incomplete` — у адреса не указано число комнат.
 */
export type SubscriptionUnpricedReason = 'house' | 'on_request' | 'config_over_limit' | 'address_incomplete'

export interface SubscriptionQuote {
  address_id: string
  housing_type: 'apt' | 'house'
  rooms: number | null
  bathrooms: number | null
  available: boolean
  reason: SubscriptionUnpricedReason | null
  /** Сумы в месяц; `null`, если `available === false`. */
  price: number | null
  currency: string
  period: 'month'
}

/** Цена подписки для своего адреса. Ничего не создаёт — оплаты на бете нет. */
export function getSubscriptionQuote(addressId: string): Promise<SubscriptionQuote> {
  return apiFetch<SubscriptionQuote>(`/me/subscription/quote?address_id=${encodeURIComponent(addressId)}`)
}
