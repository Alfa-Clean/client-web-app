import { useEffect, useMemo, useState } from 'preact/hooks'
import { ChevronRight, Info, Trash2 } from 'lucide-react'
import { BottomSheet } from './BottomSheet'
import type { HandymanWork, HandymanWorkCategoryNode } from '../api/addons'
import type { WorkItem } from '../api/orders'
import { useLocale } from '../i18n'

// ─── Labels ───────────────────────────────────────────────────────────────────

export function workLabel(work: HandymanWork, lang: string): string {
  return work.translations[lang] ?? work.translations['ru'] ?? work.id
}

export function categoryLabel(cat: { id: string; translations: Record<string, string> }, lang: string): string {
  return cat.translations[lang] ?? cat.translations['ru'] ?? cat.id
}

function workDescription(work: HandymanWork, lang: string): string | null {
  return work.description_translations[lang] ?? work.description_translations['ru'] ?? null
}

// ─── Tree helpers ─────────────────────────────────────────────────────────────

/** id узла и всех его потомков — для подсчётов по поддереву. */
function subtreeIds(node: HandymanWorkCategoryNode): string[] {
  return [node.id, ...node.children.flatMap(subtreeIds)]
}

// ─── Selected works (в форме заказа) ──────────────────────────────────────────

/**
 * Список уже выбранных работ со степперами. Работа, которой нет в каталоге
 * (снята с публикации после оформления), показывается по своему id — молча
 * выбрасывать позицию заказа нельзя.
 */
export function SelectedWorksList({
  works, selected, onChange,
}: {
  works: HandymanWork[]
  selected: WorkItem[]
  onChange: (next: WorkItem[]) => void
}) {
  const { t, lang } = useLocale()

  if (selected.length === 0) return null

  function setQty(id: string, qty: number) {
    if (qty <= 0) onChange(selected.filter(w => w.id !== id))
    else onChange(selected.map(w => w.id === id ? { ...w, qty } : w))
  }

  return (
    <div class="bg-white rounded-2xl border border-gray-100 overflow-hidden divide-y divide-gray-50">
      {selected.map(item => {
        const work = works.find(w => w.id === item.id)
        return (
          <div key={item.id} class="animate-fade-in flex items-center px-4 py-3.5 gap-2">
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-gray-900 truncate">
                {work ? workLabel(work, lang) : item.id}
              </p>
              {work && (
                <p class="text-xs text-gray-400 mt-0.5">
                  {(work.price * item.qty).toLocaleString('ru-RU')} {t('currency')}
                </p>
              )}
            </div>
            <div class="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => setQty(item.id, item.qty - 1)}
                class="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 text-sm font-bold leading-none active:bg-gray-200 transition-colors"
              >
                –
              </button>
              <span class="text-sm font-semibold text-gray-900 w-5 text-center">{item.qty}</span>
              <button
                type="button"
                onClick={() => setQty(item.id, item.qty + 1)}
                class="w-6 h-6 rounded-full bg-[#1F847B] flex items-center justify-center text-white text-sm font-bold leading-none active:bg-[#186760] transition-colors"
              >
                +
              </button>
            </div>
            <button
              type="button"
              onClick={() => setQty(item.id, 0)}
              class="w-7 h-7 shrink-0 flex items-center justify-center rounded-xl text-gray-300 active:bg-gray-100 active:text-gray-500 transition-colors"
            >
              <Trash2 size={14} />
            </button>
          </div>
        )
      })}
    </div>
  )
}

// ─── Sheet ────────────────────────────────────────────────────────────────────

interface Props {
  open: boolean
  onClose: () => void
  tree: HandymanWorkCategoryNode[]
  works: HandymanWork[]
  selected: WorkItem[]
  onChange: (next: WorkItem[]) => void
}

export function WorkPickerSheet({ open, onClose, tree, works, selected, onChange }: Props) {
  const { t, lang } = useLocale()
  const [path, setPath] = useState<HandymanWorkCategoryNode[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)
  // Направление последнего перехода — вглубь или назад; задаёт сторону анимации.
  const [dir, setDir] = useState<'forward' | 'back'>('forward')

  // Каждое открытие начинается с корня — иначе клиент вернётся в раздел,
  // о котором уже забыл, и решит, что каталог обрезан.
  useEffect(() => {
    if (open) { setPath([]); setExpandedId(null); setDir('forward') }
  }, [open])

  function goInto(cat: HandymanWorkCategoryNode) {
    setDir('forward')
    setPath(prev => [...prev, cat])
    setExpandedId(null)
  }

  function goBack() {
    setDir('back')
    setPath(prev => prev.slice(0, -1))
    setExpandedId(null)
  }

  const worksByCategory = useMemo(() => {
    const map = new Map<string, HandymanWork[]>()
    for (const w of works) {
      const key = w.category_id ?? ''
      const list = map.get(key)
      if (list) list.push(w)
      else map.set(key, [w])
    }
    return map
  }, [works])

  const current = path.length > 0 ? path[path.length - 1] : null
  const children = current ? current.children : tree
  const directWorks = worksByCategory.get(current ? current.id : '') ?? []

  function countWorksIn(node: HandymanWorkCategoryNode): number {
    return subtreeIds(node).reduce((s, id) => s + (worksByCategory.get(id)?.length ?? 0), 0)
  }

  function countSelectedIn(node: HandymanWorkCategoryNode): number {
    const ids = new Set(subtreeIds(node))
    return selected.filter(sel => {
      const w = works.find(x => x.id === sel.id)
      return !!w && !!w.category_id && ids.has(w.category_id)
    }).length
  }

  function setQty(id: string, qty: number) {
    if (qty <= 0) { onChange(selected.filter(w => w.id !== id)); return }
    if (selected.some(w => w.id === id)) {
      onChange(selected.map(w => w.id === id ? { ...w, qty } : w))
    } else {
      onChange([...selected, { id, qty }])
    }
  }

  // Пустые ветки прячем: клиенту незачем проваливаться в раздел без единой работы.
  const visibleChildren = children.filter(c => countWorksIn(c) > 0)

  // Смена ключа remount'ит уровень, и анимация входа проигрывается заново.
  const levelKey = path.map(p => p.id).join('/') || '__root__'
  const levelAnim = dir === 'forward' ? 'animate-level-in-forward' : 'animate-level-in-back'

  return (
    <BottomSheet open={open} onClose={onClose}>
      <div class="flex flex-col overflow-x-hidden">
        {/* Header */}
        <div class="sticky top-0 z-10 bg-white px-4 pt-1 pb-3 flex items-center gap-2 border-b border-gray-100">
          <div
            class={`shrink-0 overflow-hidden transition-[width,opacity] duration-200 ease-out ${current ? 'w-8 opacity-100' : 'w-0 opacity-0'}`}
          >
            <button
              type="button"
              onClick={goBack}
              class="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 text-lg font-light active:bg-gray-200 transition-colors"
            >
              ‹
            </button>
          </div>
          <div key={levelKey} class={`flex-1 min-w-0 ${levelAnim}`}>
            <p class="text-base font-bold text-gray-900 truncate">
              {current ? categoryLabel(current, lang) : t('works_picker_title')}
            </p>
            {path.length > 1 && (
              <p class="text-xs text-gray-400 truncate mt-0.5">
                {path.slice(0, -1).map(p => categoryLabel(p, lang)).join(' / ')}
              </p>
            )}
          </div>
        </div>

        {/* Body */}
        <div key={levelKey} class={`px-4 py-3 flex flex-col gap-3 ${levelAnim}`}>
          {visibleChildren.length > 0 && (
            <div class="bg-white rounded-2xl border border-gray-100 overflow-hidden divide-y divide-gray-50">
              {visibleChildren.map(cat => {
                const total = countWorksIn(cat)
                const chosen = countSelectedIn(cat)
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => goInto(cat)}
                    class="w-full flex items-center gap-2 px-4 py-3.5 text-left active:bg-gray-50 transition-colors"
                  >
                    <p class="flex-1 min-w-0 text-sm font-medium text-gray-900 truncate">
                      {categoryLabel(cat, lang)}
                    </p>
                    {chosen > 0 && (
                      <span class="animate-scale-in shrink-0 min-w-5 h-5 px-1.5 rounded-full bg-[#1F847B] text-white text-[11px] font-semibold flex items-center justify-center">
                        {chosen}
                      </span>
                    )}
                    <span class="shrink-0 text-xs text-gray-400">{total}</span>
                    <ChevronRight size={16} class="shrink-0 text-gray-300" />
                  </button>
                )
              })}
            </div>
          )}

          {directWorks.length > 0 && (
            <div class="bg-white rounded-2xl border border-gray-100 overflow-hidden divide-y divide-gray-50">
              {directWorks.map(work => {
                const qty = selected.find(w => w.id === work.id)?.qty ?? 0
                const on = qty > 0
                const desc = workDescription(work, lang)
                return (
                  <div key={work.id}>
                    <div class="flex items-center px-4 py-3.5 gap-2">
                      <div class="flex-1 min-w-0 flex items-center gap-1.5">
                        <p
                          class={`text-sm font-medium truncate cursor-pointer ${on ? 'text-[#186760]' : 'text-gray-900'}`}
                          onClick={() => setQty(work.id, on ? 0 : 1)}
                        >
                          {workLabel(work, lang)}
                        </p>
                        {desc && (
                          <button
                            type="button"
                            onClick={() => setExpandedId(prev => prev === work.id ? null : work.id)}
                            class="shrink-0 w-5 h-5 flex items-center justify-center text-gray-400 active:text-gray-500 transition-colors"
                          >
                            <Info size={14} />
                          </button>
                        )}
                      </div>
                      <div class="flex items-center gap-2 shrink-0">
                        <span class="text-xs text-gray-400">+{work.price.toLocaleString('ru-RU')}</span>
                        {on ? (
                          <div class="animate-scale-in flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setQty(work.id, qty - 1)}
                              class="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 text-sm font-bold leading-none active:bg-gray-200 transition-colors"
                            >
                              –
                            </button>
                            <span class="text-sm font-semibold text-gray-900 w-5 text-center">{qty}</span>
                            <button
                              type="button"
                              onClick={() => setQty(work.id, qty + 1)}
                              class="w-6 h-6 rounded-full bg-[#1F847B] flex items-center justify-center text-white text-sm font-bold leading-none active:bg-[#186760] transition-colors"
                            >
                              +
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setQty(work.id, 1)}
                            class="w-5 h-5 rounded-md border-2 border-gray-300 flex items-center justify-center transition-colors"
                          />
                        )}
                      </div>
                    </div>
                    {/* grid-rows 0fr→1fr — раскрытие описания по реальной высоте, без max-height наугад */}
                    {desc && (
                      <div
                        class={`grid transition-[grid-template-rows,opacity] duration-200 ease-out ${
                          expandedId === work.id ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                        }`}
                      >
                        <div class="overflow-hidden">
                          <p class="px-4 pb-3 -mt-1 text-xs text-gray-500 leading-relaxed">{desc}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {visibleChildren.length === 0 && directWorks.length === 0 && (
            <p class="text-sm text-gray-400 text-center py-8">{t('works_empty_category')}</p>
          )}
        </div>

        {/* Footer */}
        <div class="sticky bottom-0 bg-white border-t border-gray-100 px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            class="w-full py-3.5 rounded-2xl text-sm font-semibold text-white transition-colors"
            style="background:#1F847B"
          >
            {selected.length > 0
              ? `${t('works_done')} · ${selected.length}`
              : t('works_done')}
          </button>
        </div>
      </div>
    </BottomSheet>
  )
}
