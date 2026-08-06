interface Props {
  /** Диаметр в px */
  size?: number
  /** Цвет кольца; прозрачный сегмент задаётся border-t-transparent */
  class?: string
}

/** Крутящееся кольцо для состояния загрузки внутри кнопок и списков. */
export function Spinner({ size = 18, class: className = 'border-current' }: Props) {
  return (
    <span
      role="status"
      aria-label="loading"
      style={{ width: size, height: size }}
      class={`inline-block border-2 border-t-transparent rounded-full animate-spin shrink-0 ${className}`}
    />
  )
}
