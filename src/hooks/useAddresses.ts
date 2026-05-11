import { useCallback, useEffect, useState } from 'preact/hooks'
import { getAddresses, type Address } from '../api/addresses'

type State =
  | { status: 'loading' }
  | { status: 'success'; data: Address[] }
  | { status: 'error'; message: string }

export function useAddresses(telegramId: number | null) {
  const [state, setState] = useState<State>({ status: 'loading' })
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (!telegramId) return

    setState({ status: 'loading' })

    getAddresses(telegramId)
      .then(data => setState({ status: 'success', data }))
      .catch(err => setState({ status: 'error', message: String(err.message) }))
  }, [telegramId, tick])

  const reload = useCallback(() => setTick(t => t + 1), [])

  return { state, reload }
}
