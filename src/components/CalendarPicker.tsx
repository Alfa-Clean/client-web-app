import { useState } from 'preact/hooks'
import type { Lang } from '../i18n/locales'

const LOCALE_MAP: Record<Lang, string> = { ru: 'ru-RU', uz: 'uz-UZ', en: 'en-US' }

const DAY_HEADERS: Record<Lang, string[]> = {
  ru: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'],
  uz: ['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya'],
  en: ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'],
}

function buildGrid(yearMonth: string): Array<string | null> {
  const [y, m] = yearMonth.split('-').map(Number)
  const startOffset = (new Date(y, m - 1, 1).getDay() + 6) % 7 // Mon = 0
  const daysInMonth = new Date(y, m, 0).getDate()
  const cells: Array<string | null> = Array(startOffset).fill(null)
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(`${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`)
  }
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

interface Props {
  availableDates: Set<string>
  value: string
  lang: Lang
  cancelLabel: string
  onSelect: (iso: string) => void
  onClose: () => void
}

export function CalendarPicker({ availableDates, value, lang, cancelLabel, onSelect, onClose }: Props) {
  const months = [...new Set([...availableDates].map(d => d.slice(0, 7)))].sort()
  const initMonth = (value ? value.slice(0, 7) : null) ?? months[0] ?? ''
  const [current, setCurrent] = useState(initMonth)

  const idx = months.indexOf(current)
  const cells = buildGrid(current)
  const [y, m] = current.split('-').map(Number)
  const monthLabel = new Intl.DateTimeFormat(LOCALE_MAP[lang], { month: 'long', year: 'numeric' })
    .format(new Date(y, m - 1, 1))

  return (
    <div class="fixed inset-0 z-50 flex items-end" onClick={onClose}>
      <div class="absolute inset-0 bg-black/40 animate-fade-in" />
      <div
        class="relative w-full bg-white rounded-t-3xl animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        <div class="flex justify-center pt-3 pb-1">
          <div class="w-10 h-1 rounded-full bg-gray-200" />
        </div>

        <div class="flex items-center justify-between px-5 py-3">
          <button
            type="button"
            onClick={() => idx > 0 && setCurrent(months[idx - 1])}
            disabled={idx === 0}
            class="w-9 h-9 flex items-center justify-center rounded-xl text-xl text-gray-700 disabled:opacity-20 hover:bg-gray-100 transition-colors"
          >
            ‹
          </button>
          <p class="text-sm font-semibold text-gray-900 capitalize">{monthLabel}</p>
          <button
            type="button"
            onClick={() => idx < months.length - 1 && setCurrent(months[idx + 1])}
            disabled={idx === months.length - 1}
            class="w-9 h-9 flex items-center justify-center rounded-xl text-xl text-gray-700 disabled:opacity-20 hover:bg-gray-100 transition-colors"
          >
            ›
          </button>
        </div>

        <div class="grid grid-cols-7 px-4 mb-1">
          {DAY_HEADERS[lang].map(d => (
            <p key={d} class="text-center text-xs font-medium text-gray-400 py-1">{d}</p>
          ))}
        </div>

        <div class="grid grid-cols-7 px-4 gap-y-1 pb-2">
          {cells.map((iso, i) => {
            if (!iso) return <div key={`empty-${i}`} />
            const day = Number(iso.slice(8))
            const available = availableDates.has(iso)
            const selected = iso === value
            return (
              <button
                key={iso}
                type="button"
                disabled={!available}
                onClick={() => { onSelect(iso); onClose() }}
                class={`aspect-square flex items-center justify-center rounded-xl text-xl transition-colors ${
                  selected
                    ? 'bg-blue-600 text-white font-semibold'
                    : available
                      ? 'text-gray-900 hover:bg-blue-50 font-medium'
                      : 'text-gray-200'
                }`}
              >
                {day}
              </button>
            )
          })}
        </div>

        <div class="border-t border-gray-100 mx-4 mt-1" />
        <div class="px-4 py-3 pb-8">
          <button
            type="button"
            onClick={onClose}
            class="w-full py-3 text-sm font-medium text-gray-500 hover:bg-gray-50 rounded-xl transition-colors"
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
