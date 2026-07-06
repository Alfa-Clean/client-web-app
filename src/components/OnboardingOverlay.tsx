import { useEffect, useState } from 'preact/hooks'
import type { RefObject } from 'preact'

export interface OnboardingStep {
  ref: RefObject<HTMLElement>
  title: string
  description: string
}

interface Props {
  steps: OnboardingStep[]
  skipLabel: string
  nextLabel: string
  doneLabel: string
  onFinish: () => void
}

interface Rect { top: number; left: number; width: number; height: number }

export function OnboardingOverlay({ steps, skipLabel, nextLabel, doneLabel, onFinish }: Props) {
  const [index, setIndex] = useState(0)
  const [rect, setRect] = useState<Rect | null>(null)

  const step = steps[index]
  const isLast = index === steps.length - 1

  useEffect(() => {
    const el = step?.ref.current
    if (!el) {
      // Таргет ещё не смонтирован (например, секция ждёт асинхронных данных) — пропускаем шаг,
      // чтобы тур не застревал на пустом экране без подсветки и кнопок.
      if (index >= steps.length - 1) onFinish()
      else setIndex(i => i + 1)
      return
    }
    const target = el
    function measure() {
      const r = target.getBoundingClientRect()
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height })
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [index, step])

  if (!step || !rect) return null

  const pad = 8
  const cutout = {
    top: rect.top - pad,
    left: rect.left - pad,
    width: rect.width + pad * 2,
    height: rect.height + pad * 2,
  }

  const viewportH = window.innerHeight
  const spaceBelow = viewportH - (cutout.top + cutout.height)
  const showBelow = spaceBelow > 160

  function handleNext() {
    if (isLast) onFinish()
    else setIndex(i => i + 1)
  }

  return (
    <div class="fixed inset-0 z-[9999]">
      <div
        class="absolute rounded-2xl transition-all duration-300 pointer-events-none"
        style={{
          top: `${cutout.top}px`,
          left: `${cutout.left}px`,
          width: `${cutout.width}px`,
          height: `${cutout.height}px`,
          boxShadow: '0 0 0 9999px rgba(0,0,0,0.7)',
        }}
      />
      <div
        class="absolute bg-white rounded-2xl p-4 shadow-xl transition-all duration-300"
        style={{
          left: '16px',
          right: '16px',
          ...(showBelow
            ? { top: `${cutout.top + cutout.height + 12}px` }
            : { top: `${Math.max(12, cutout.top - 12 - 132)}px` }),
        }}
      >
        <p class="text-base font-bold text-gray-900">{step.title}</p>
        <p class="text-sm text-gray-500 mt-1">{step.description}</p>
        <div class="flex items-center justify-between mt-4">
          <button
            type="button"
            onClick={onFinish}
            class="text-sm font-medium text-gray-400 active:opacity-70 transition-opacity"
          >
            {skipLabel}
          </button>
          <div class="flex items-center gap-3">
            <span class="text-xs text-gray-300">{index + 1}/{steps.length}</span>
            <button
              type="button"
              onClick={handleNext}
              class="px-4 py-2 rounded-xl bg-[#44973A] text-white text-sm font-semibold active:opacity-90 transition-opacity"
            >
              {isLast ? doneLabel : nextLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
