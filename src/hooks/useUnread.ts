import { useCallback, useEffect, useRef, useState } from 'preact/hooks'
import { getUnreadSummary } from '../api/conversations'
import type { UnreadEntry } from '../api/conversations'

/** Как часто опрашиваем сводку непрочитанных, мс. */
const POLL_MS = 15000

/**
 * Непрочитанные сообщения по всем диалогам клиента.
 *
 * Ключ карты — `context_id` диалога, то есть id заказа (для support — telegram_id).
 * Спор по заказу схлопывается в ту же запись, что и сам заказ: для UI это один
 * и тот же чат-вход.
 */
export function useUnread() {
  const [byContext, setByContext] = useState<Record<string, number>>({})
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const refresh = useCallback(async () => {
    try {
      const { items } = await getUnreadSummary()
      setByContext(toMap(items))
    } catch {
      // сеть/403 — молча оставляем прошлое состояние, бейдж не критичен
    }
  }, [])

  useEffect(() => {
    refresh()
    timerRef.current = setInterval(refresh, POLL_MS)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [refresh])

  /** Локально гасит бейдж, не дожидаясь следующего опроса. */
  const clearFor = useCallback((contextId: string) => {
    setByContext(prev => {
      if (!prev[contextId]) return prev
      const next = { ...prev }
      delete next[contextId]
      return next
    })
  }, [])

  const total = Object.values(byContext).reduce((sum, n) => sum + n, 0)

  return { byContext, total, refresh, clearFor }
}

function toMap(items: UnreadEntry[]): Record<string, number> {
  const map: Record<string, number> = {}
  for (const item of items) {
    map[item.context_id] = (map[item.context_id] ?? 0) + item.unread_count
  }
  return map
}
