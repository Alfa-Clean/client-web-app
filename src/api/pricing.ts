import { apiFetch } from './client'
import type { Lang } from '../i18n/locales'

// Единая точка расчёта цены. Тарифы живут в БД, локально цену считать нельзя.
// Эндпоинт публичный, лимит 60 запросов/мин на IP — вызывать только с дебаунсом.

export type Vertical = 'cleaning' | 'handyman'
export type QuoteServiceType = 'standard' | 'general' | 'afterrepair'
export type QuoteHousingType = 'apt' | 'house'

export type PromoReason =
  | 'not_found'
  | 'inactive'
  | 'expired'
  | 'not_started'
  | 'wrong_vertical'
  | 'already_used'

export interface QuantityItem {
  id: string
  /** 1..100 */
  qty: number
}

export interface CleaningQuoteRequest {
  vertical: 'cleaning'
  service_type: QuoteServiceType
  /** 1..10 */
  rooms: number
  /** 1..5 */
  bathrooms: number
  housing_type?: QuoteHousingType
  urgent?: boolean
  addons?: QuantityItem[]
  promo_code?: string | null
  /** Нужен только для проверки «этот код уже использован этим клиентом». */
  telegram_id?: number | null
}

export interface HandymanQuoteRequest {
  vertical: 'handyman'
  /** Минимум 1 элемент. */
  works: QuantityItem[]
  urgent?: boolean
  promo_code?: string | null
  telegram_id?: number | null
}

export type QuoteRequest = CleaningQuoteRequest | HandymanQuoteRequest

export type PriceLineKind =
  | 'base'
  | 'extra'
  | 'addon'
  | 'work'
  | 'fee'
  | 'surcharge'
  | 'discount'
  | 'promo'
  | 'rounding'

export interface PriceLine {
  code: string
  kind: PriceLineKind
  /** Уже переведён сервером по параметру `lang`. */
  label: string
  qty: number
  /** Со знаком. */
  unit_price: number
  /** Со знаком. */
  amount: number
}

export interface PromoResult {
  code: string
  valid: boolean
  reason: PromoReason | null
  discount_pct: number | null
  /** <= 0 */
  amount: number
}

export interface QuoteResponse {
  vertical: Vertical
  currency: 'UZS'
  subtotal: number
  original_total: number
  total: number
  /** >= 0 */
  discount_total: number
  lines: PriceLine[]
  promo: PromoResult | null
  /** Непустой массив = тариф не заведён, цена неполная. */
  warnings: string[]
}

export function getQuote(
  request: QuoteRequest,
  lang: Lang,
  signal?: AbortSignal,
): Promise<QuoteResponse> {
  return apiFetch<QuoteResponse>(`/pricing/quote?lang=${lang}`, {
    method: 'POST',
    body: JSON.stringify(request),
    signal,
  })
}
