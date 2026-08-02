import logoUrl from '../assets/chaqqon-logo.svg'

interface Props {
  /** Tailwind-класс высоты, напр. 'h-8' */
  class?: string
}

/** Вордмарк chaqqon! — прямые буквы, наклонный «!» */
export function Logo({ class: cls = 'h-8' }: Props) {
  return <img src={logoUrl} alt="chaqqon!" class={`${cls} w-auto select-none`} draggable={false} />
}
