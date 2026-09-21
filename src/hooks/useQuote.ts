import { useEffect, useRef, useState } from 'preact/hooks'
import type { QuoteRequest, QuoteResponse } from '../api/pricing'
import { getQuote } from '../api/pricing'
import { ApiError } from '../api/client'
import type { Lang } from '../i18n/locales'

const DEBOUNCE_MS = 400
const RATE_LIMIT_RETRY_MS = 3000

// Кеш нужен, чтобы шаги «туда-обратно» по форме не жгли лимит 60 req/min.
// Ключ — состав запроса, но результат зависит и от того, чего в ключе нет:
// истории клиента (скидка новичка, использованный промокод) и настроек на
// сервере (срок и активность промокода, тарифы). Раньше кеш жил всю сессию, и
// приложение показывало промокод действующим после того, как его сдвинули или
// выключили, и сгоревшую скидку новичка после заказа (бета, баг #14). Поэтому:
// - запись живёт минуту — этого хватает на шаги формы;
// - расчёт с промокодом не кешируется вовсе: «Применить» — явная просьба
//   проверить код сейчас, и таких запросов мало;
// - после заказа кеш сбрасывается целиком (`clearQuoteCache`).
const CACHE_TTL_MS = 60_000

interface CacheEntry {
  quote: QuoteResponse
  storedAt: number
}

const cache = new Map<string, CacheEntry>()

function cachedQuote(key: string | null, request: QuoteRequest | null): QuoteResponse | null {
  if (!key || !request || request.promo_code) return null
  const entry = cache.get(key)
  if (!entry) return null
  if (Date.now() - entry.storedAt > CACHE_TTL_MS) {
    cache.delete(key)
    return null
  }
  return entry.quote
}

/** Забыть все расчёты: история клиента изменилась (оформлен заказ). */
export function clearQuoteCache() {
  cache.clear()
}

export interface QuoteState {
  /** Последний успешный расчёт. Во время пересчёта остаётся прежним — чтобы цена не мигала. */
  quote: QuoteResponse | null
  loading: boolean
  error: boolean
}

/**
 * Дебаунсит `POST /pricing/quote` по составу запроса.
 * `request === null` — расчёт не нужен (например, ничего ещё не выбрано).
 */
export function useQuote(request: QuoteRequest | null, lang: Lang): QuoteState {
  const key = request ? `${lang}|${JSON.stringify(request)}` : null

  const [state, setState] = useState<QuoteState>(() => ({
    quote: cachedQuote(key, request),
    loading: false,
    error: false,
  }))

  // request пересоздаётся каждый рендер — в зависимости эффекта идёт только key.
  const requestRef = useRef(request)
  requestRef.current = request

  useEffect(() => {
    if (!key) {
      setState({ quote: null, loading: false, error: false })
      return
    }

    const cached = cachedQuote(key, requestRef.current)
    if (cached) {
      setState({ quote: cached, loading: false, error: false })
      return
    }

    setState(prev => ({ quote: prev.quote, loading: true, error: false }))

    const ctrl = new AbortController()
    let retryTimer: ReturnType<typeof setTimeout> | undefined

    function run(attempt: number) {
      const req = requestRef.current
      if (!req) return
      getQuote(req, lang, ctrl.signal)
        .then(quote => {
          if (!req.promo_code) cache.set(key!, { quote, storedAt: Date.now() })
          setState({ quote, loading: false, error: false })
        })
        .catch((e: unknown) => {
          if (ctrl.signal.aborted) return
          if (attempt === 0 && e instanceof ApiError && e.status === 429) {
            retryTimer = setTimeout(() => run(1), RATE_LIMIT_RETRY_MS)
            return
          }
          setState(prev => ({ quote: prev.quote, loading: false, error: true }))
        })
    }

    const debounce = setTimeout(() => run(0), DEBOUNCE_MS)

    return () => {
      clearTimeout(debounce)
      if (retryTimer) clearTimeout(retryTimer)
      ctrl.abort()
    }
  }, [key, lang])

  return state
}
