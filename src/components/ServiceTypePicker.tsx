import { useEffect, useRef, useState } from 'preact/hooks'
import { Bath, Check, ChevronDown, CookingPot, Plus, Sofa } from 'lucide-react'
import type { ServiceType } from '../api/orders'
import { useLocale } from '../i18n'

const TYPES: ServiceType[] = ['standard', 'general']

/**
 * Зоны состава уборки. Пункты — строки перевода через `\n`; у генеральной
 * к зоне добавляется `scope_<zone>_general`, если такой ключ есть.
 */
const ZONES = [
  { key: 'kitchen', Icon: CookingPot, hasGeneral: true },
  { key: 'bath', Icon: Bath, hasGeneral: false },
  { key: 'rooms', Icon: Sofa, hasGeneral: true },
] as const

interface Props {
  /** null — тип ещё не выбран: следующий шаг заказа скрыт. */
  value: ServiceType | null
  onSelect: (type: ServiceType) => void
}

/**
 * Тип уборки: карточки листаются вбок, под ними — полный состав той,
 * что сейчас на экране (аккордеон). Тап по карточке выбирает тип.
 */
export function ServiceTypePicker({ value, onSelect }: Props) {
  const { t } = useLocale()
  const trackRef = useRef<HTMLDivElement>(null)
  const [inView, setInView] = useState<ServiceType>(
    value && TYPES.includes(value) ? value : 'standard',
  )
  // Состав свёрнут: экран заказа короче, кому интересно — раскроет.
  // Состояние общее для карточек — при свайпе раскрытый список остаётся раскрытым.
  const [open, setOpen] = useState(false)

  function scrollToType(type: ServiceType, behavior: ScrollBehavior) {
    const track = trackRef.current
    const card = track?.children[TYPES.indexOf(type)] as HTMLElement | undefined
    if (!track || !card) return
    track.scrollTo({ left: card.offsetLeft - track.offsetLeft - 16, behavior })
  }

  // Повтор заказа с генеральной — карусель сразу на её карточке.
  useEffect(() => {
    if (value && value !== 'standard' && TYPES.includes(value)) scrollToType(value, 'instant')
  }, [])

  function handleScroll() {
    const track = trackRef.current
    if (!track) return
    const max = track.scrollWidth - track.clientWidth
    if (max <= 0) return
    const idx = Math.round((track.scrollLeft / max) * (TYPES.length - 1))
    setInView(TYPES[Math.min(Math.max(idx, 0), TYPES.length - 1)])
  }

  function select(type: ServiceType) {
    onSelect(type)
    setInView(type)
    scrollToType(type, 'smooth')
  }

  const lines = (key: string) => t(key).split('\n').filter(Boolean)
  const zones = ZONES.map(z => ({
    ...z,
    items: lines(`scope_${z.key}`),
    extra: inView === 'general' && z.hasGeneral ? lines(`scope_${z.key}_general`) : [],
  }))

  return (
    <div class="flex flex-col gap-3">
      <div
        ref={trackRef}
        onScroll={handleScroll}
        class="-mx-4 px-4 flex gap-2.5 overflow-x-auto snap-x snap-mandatory scroll-px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {TYPES.map(type => {
          const active = value === type
          return (
            <button
              key={type}
              type="button"
              onClick={() => select(type)}
              class={`w-[85%] shrink-0 snap-start flex flex-col gap-2 px-4 py-3.5 rounded-[20px] border-2 text-left transition-colors ${
                active ? 'border-[#1F847B] bg-[#F3F9F9]' : 'border-gray-200 bg-white'
              }`}
            >
              <span class="flex items-center gap-2.5">
                <span
                  class={`w-5 h-5 shrink-0 rounded-full border-2 flex items-center justify-center transition-colors ${
                    active ? 'border-[#1F847B]' : 'border-gray-300'
                  }`}
                >
                  {active && <span class="w-2.5 h-2.5 rounded-full bg-[#1F847B] animate-scale-in" />}
                </span>
                <span class={`text-base font-bold ${active ? 'text-[#186760]' : 'text-gray-900'}`}>
                  {t(`svc_${type}`)}
                </span>
              </span>
              <span class="text-xs text-gray-500 leading-relaxed">{t(`svc_${type}_desc`)}</span>
              <span class="flex items-center gap-1.5 text-[#1F847B]">
                {ZONES.map(({ key, Icon }) => <Icon key={key} size={16} />)}
              </span>
            </button>
          )
        })}
      </div>

      <div class="flex justify-center gap-1.5">
        {TYPES.map(type => (
          <span
            key={type}
            class={`h-1.5 rounded-full transition-all ${type === inView ? 'w-[18px] bg-[#2EC4B6]' : 'w-1.5 bg-gray-300'}`}
          />
        ))}
      </div>

      {/* Ключ по типу — при свайпе состав сменяется с проявлением */}
      <div key={inView} class="animate-fade-in bg-white rounded-2xl">
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen(o => !o)}
          class="w-full flex items-center gap-3 px-4 py-3.5 text-left rounded-2xl active:bg-gray-50 transition-colors"
        >
          <span class="flex-1 text-sm font-semibold text-gray-900">
            {t('scope_title')}: {t(`svc_${inView}`).toLowerCase()}
          </span>
          <ChevronDown
            size={16}
            class={`shrink-0 text-gray-400 transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
          />
        </button>
        {/* grid-rows 0fr→1fr — раскрытие по реальной высоте, без max-height наугад */}
        <div class={`grid transition-all duration-300 ease-in-out ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
          <div class="overflow-hidden">
            <div class="px-4 pb-3.5 flex flex-col gap-2.5">
              {zones.map(({ key, Icon, items, extra }) => (
                <div key={key} class="flex flex-col gap-2 pt-2.5 border-t border-gray-100">
                  <p class="flex items-center gap-2 text-xs font-semibold text-gray-700">
                    <Icon size={16} class="text-[#1F847B] shrink-0" />
                    <span class="flex-1">{t(`scope_zone_${key}`)}</span>
                  </p>
                  {items.map(item => (
                    <p key={item} class="flex items-start gap-2.5 text-sm text-gray-900">
                      <span class="w-[18px] h-[18px] mt-px shrink-0 rounded-full bg-[#E8F8F6] text-[#1F847B] flex items-center justify-center">
                        <Check size={12} strokeWidth={3} />
                      </span>
                      {item}
                    </p>
                  ))}
                  {extra.map(item => (
                    <p key={item} class="flex items-start gap-2.5 text-sm font-medium text-[#186760]">
                      <span class="w-[18px] h-[18px] mt-px shrink-0 rounded-full bg-[#2EC4B6] text-white flex items-center justify-center">
                        <Plus size={12} strokeWidth={3} />
                      </span>
                      {item}
                    </p>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
