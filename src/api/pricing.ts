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

// ─── Кеш расчётов ─────────────────────────────────────────────────────────────
//
// Нужен, чтобы шаги «туда-обратно» по форме не жгли лимит 60 req/min. Ключ —
// состав запроса, но ответ зависит и от того, чего в ключе нет: истории клиента
// (скидка новичка, использованный промокод) и настроек на сервере (срок и
// активность промокода, тарифы) — см. backend/domains/pricing.md. Раньше кеш
// жил всю сессию и показывал сгоревшие скидки и снятые промокоды действующими
// (бета, баг #14). Поэтому:
// - запись живёт минуту — этого хватает на шаги формы;
// - расчёт с промокодом не кешируется: «Применить» — явная просьба проверить
//   код сейчас, и таких запросов мало;
// - создание и отмена заказа сбрасывают кеш целиком (`api/orders.ts`): они
//   сжигают или возвращают скидку новичка и промокод.
const QUOTE_CACHE_TTL_MS = 60_000

const quoteCache = new Map<string, { quote: QuoteResponse; storedAt: number }>()

export function quoteCacheKey(request: QuoteRequest, lang: Lang): string {
  return `${lang}|${JSON.stringify(request)}`
}

export function getCachedQuote(request: QuoteRequest, lang: Lang): QuoteResponse | null {
  if (request.promo_code) return null
  const key = quoteCacheKey(request, lang)
  const entry = quoteCache.get(key)
  if (!entry) return null
  if (Date.now() - entry.storedAt > QUOTE_CACHE_TTL_MS) {
    quoteCache.delete(key)
    return null
  }
  return entry.quote
}

export function cacheQuote(request: QuoteRequest, lang: Lang, quote: QuoteResponse) {
  if (request.promo_code) return
  quoteCache.set(quoteCacheKey(request, lang), { quote, storedAt: Date.now() })
}

/** Забыть все расчёты: история клиента изменилась (заказ создан или отменён). */
export function clearQuoteCache() {
  quoteCache.clear()
}
