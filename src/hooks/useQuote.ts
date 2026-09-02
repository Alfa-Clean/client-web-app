import { useEffect, useRef, useState } from 'preact/hooks'
import type { QuoteRequest, QuoteResponse } from '../api/pricing'
import { getQuote } from '../api/pricing'
import { ApiError } from '../api/client'
import type { Lang } from '../i18n/locales'

const DEBOUNCE_MS = 400
const RATE_LIMIT_RETRY_MS = 3000

// Расчёт детерминирован по составу запроса — кешируем на время сессии,
// чтобы шаги «туда-обратно» по форме не жгли лимит 60 req/min.
const cache = new Map<string, QuoteResponse>()

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
    quote: key ? cache.get(key) ?? null : null,
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

    const cached = cache.get(key)
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
          cache.set(key!, quote)
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
