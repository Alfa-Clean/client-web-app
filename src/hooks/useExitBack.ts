import { useState } from 'preact/hooks'

export function useExitBack(onBack: () => void, duration = 240) {
  const [exiting, setExiting] = useState(false)

  function handleBack() {
    setExiting(true)
    setTimeout(onBack, duration)
  }

  return { exiting, handleBack }
}
