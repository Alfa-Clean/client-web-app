import { useState } from 'preact/hooks'
import type { ComponentChildren } from 'preact'
import type { Addon } from '../api/addons'
import { BottomSheet } from './BottomSheet'

// ─── Built-in icons ───────────────────────────────────────────────────────────

const ADDON_ICONS: Record<string, ComponentChildren> = {
  windows: (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <rect x="2" y="2" width="14" height="14" rx="2" stroke="currentColor" stroke-width="1.5"/>
      <line x1="9" y1="2" x2="9" y2="16" stroke="currentColor" stroke-width="1.5"/>
      <line x1="2" y1="9" x2="16" y2="9" stroke="currentColor" stroke-width="1.5"/>
    </svg>
  ),
  oven: (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <rect x="2" y="3" width="14" height="12" rx="2" stroke="currentColor" stroke-width="1.5"/>
      <rect x="5" y="7" width="8" height="5" rx="1" stroke="currentColor" stroke-width="1.3"/>
      <circle cx="5.5" cy="5" r="1" fill="currentColor"/>
      <circle cx="9" cy="5" r="1" fill="currentColor"/>
      <circle cx="12.5" cy="5" r="1" fill="currentColor"/>
    </svg>
  ),
  balcony: (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M2 14h14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      <path d="M4 14V8h10v6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M4 8V6a5 5 0 0 1 10 0v2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    </svg>
  ),
  fridge: (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <rect x="4" y="2" width="10" height="14" rx="2" stroke="currentColor" stroke-width="1.5"/>
      <line x1="4" y1="8" x2="14" y2="8" stroke="currentColor" stroke-width="1.5"/>
      <line x1="7" y1="5" x2="7" y2="7" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
      <line x1="7" y1="10" x2="7" y2="13" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
    </svg>
  ),
}

const ICON_FALLBACK = (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <circle cx="9" cy="9" r="6.5" stroke="currentColor" stroke-width="1.5"/>
    <path d="M6.5 9.5C7 11 8 11.5 9 11.5s2-.5 2.5-2" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
    <path d="M7 7h.01M11 7h.01" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
  </svg>
)

// ─── Addon row (shared between main view and sheet) ───────────────────────────

function AddonRow({
  addon,
  on,
  lang,
  onToggle,
}: {
  addon: Addon
  on: boolean
  lang: 'ru' | 'uz' | 'en'
  onToggle: () => void
}) {
  const name = lang === 'uz' && addon.name_uz ? addon.name_uz : addon.name_ru
  const icon = ADDON_ICONS[addon.id] ?? ICON_FALLBACK
  return (
    <button
      type="button"
      onClick={onToggle}
      class={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl border-2 text-left transition-colors ${
        on
          ? 'bg-[#F0F9EE] dark:bg-[#1a3a2a] border-[#44973A]'
          : 'bg-white border-gray-100 active:bg-gray-50'
      }`}
    >
      <span class={`shrink-0 ${on ? 'text-[#44973A]' : 'text-gray-400'}`}>
        {icon}
      </span>
      <span class={`flex-1 text-sm font-medium ${on ? 'text-[#2D6126] dark:text-[#6DB363]' : 'text-gray-900'}`}>
        {name}
      </span>
    </button>
  )
}

// ─── Sheet list with category groups ─────────────────────────────────────────

function AddonSheetList({
  addons,
  draft,
  lang,
  onToggle,
}: {
  addons: Addon[]
  draft: string[]
  lang: 'ru' | 'uz' | 'en'
  onToggle: (id: string) => void
}) {
  // Group by category; addons without category go into null bucket
  const groups = new Map<string | null, Addon[]>()
  for (const addon of addons) {
    const cat = (lang === 'uz' ? addon.category_uz : addon.category_ru) ?? addon.category_ru ?? null
    if (!groups.has(cat)) groups.set(cat, [])
    groups.get(cat)!.push(addon)
  }

  // null category last
  const sorted = [...groups.entries()].sort(([a], [b]) => {
    if (a === null) return 1
    if (b === null) return -1
    return 0
  })

  return (
    <div class="flex flex-col gap-5">
      {sorted.map(([cat, items]) => (
        <div key={cat ?? '__no_cat'}>
          {cat && (
            <p class="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-2 px-1">
              {cat}
            </p>
          )}
          <div class="flex flex-col gap-2">
            {items.map(addon => (
              <AddonRow
                key={addon.id}
                addon={addon}
                on={draft.includes(addon.id)}
                lang={lang}
                onToggle={() => onToggle(addon.id)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  addons: Addon[]
  selected: string[]
  lang?: 'ru' | 'uz' | 'en'
  addMoreLabel?: string
  doneLabel?: string
  onChange: (ids: string[]) => void
}

export function AddonPicker({
  addons,
  selected,
  lang = 'ru',
  addMoreLabel = 'Добавить услуги',
  doneLabel = 'Готово',
  onChange,
}: Props) {
  const [sheetOpen, setSheetOpen] = useState(false)
  const [draft, setDraft] = useState<string[]>(selected)

  if (addons.length === 0) return null

  function toggleDraft(id: string) {
    setDraft(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id],
    )
  }

  function openSheet() {
    setDraft(selected)
    setSheetOpen(true)
  }

  function confirm() {
    onChange(draft)
    setSheetOpen(false)
  }

  const selectedAddons = addons.filter(a => selected.includes(a.id))

  return (
    <>
      <div class="flex flex-col gap-2">
        {selectedAddons.map(addon => (
          <AddonRow
            key={addon.id}
            addon={addon}
            on
            lang={lang}
            onToggle={() => onChange(selected.filter(x => x !== addon.id))}
          />
        ))}

        <button
          type="button"
          onClick={openSheet}
          class="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl border-2 border-dashed border-gray-200 bg-white active:bg-gray-50 transition-colors text-left"
        >
          <span class="w-[18px] h-[18px] flex items-center justify-center text-gray-400 text-lg font-light shrink-0">
            +
          </span>
          <span class="text-sm font-medium text-gray-500">{addMoreLabel}</span>
        </button>
      </div>

      <BottomSheet open={sheetOpen} onClose={() => setSheetOpen(false)}>
        <div class="px-4 pt-2 pb-4">
          <AddonSheetList addons={addons} draft={draft} lang={lang} onToggle={toggleDraft} />
          <button
            type="button"
            onClick={confirm}
            class="w-full py-4 rounded-2xl text-sm font-semibold text-white transition-colors mt-4"
            style="background:#44973A"
          >
            {draft.length > 0 ? `${doneLabel} · ${draft.length}` : doneLabel}
          </button>
        </div>
      </BottomSheet>
    </>
  )
}
