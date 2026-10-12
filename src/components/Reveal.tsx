import { useEffect, useRef } from 'preact/hooks'
import type { ComponentChildren } from 'preact'

/**
 * Шаг формы заказа: проявляется и докручивает экран к себе. Шаг, видимый
 * с первого рендера (черновик, повтор заказа), экран не крутит.
 */
export function Reveal({ show, children }: { show: boolean; children: ComponentChildren }) {
  const ref = useRef<HTMLDivElement>(null)
  const quiet = useRef(show)

  useEffect(() => {
    if (!show || quiet.current) {
      quiet.current = false
      return
    }
    // Кадр на монтирование, иначе высота блока ещё не учтена
    const id = requestAnimationFrame(() =>
      ref.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }),
    )
    return () => cancelAnimationFrame(id)
  }, [show])

  if (!show) return null
  // scroll-mb — место под закреплённую кнопку внизу
  return <div ref={ref} class="animate-reveal scroll-mb-40 flex flex-col gap-6">{children}</div>
}
