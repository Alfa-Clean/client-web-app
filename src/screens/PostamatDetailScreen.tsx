import { useState } from 'preact/hooks'
import type { Postamat } from './ChistomatyScreen'

// ─── Mock cells ───────────────────────────────────────────────────────────────

type CellType = 'clothes' | 'shoes'

interface Cell {
  id: string
  type: CellType
  size: string
  number: number
  free: boolean
}

function makeCells(postamatId: number): Cell[] {
  const clothes: Cell[] = [
    { id: `${postamatId}-c1`, type: 'clothes', size: 'S',  number: 1, free: true },
    { id: `${postamatId}-c2`, type: 'clothes', size: 'M',  number: 2, free: true },
    { id: `${postamatId}-c3`, type: 'clothes', size: 'M',  number: 3, free: false },
    { id: `${postamatId}-c4`, type: 'clothes', size: 'L',  number: 4, free: true },
    { id: `${postamatId}-c5`, type: 'clothes', size: 'XL', number: 5, free: false },
  ]
  const shoes: Cell[] = [
    { id: `${postamatId}-s1`, type: 'shoes', size: '', number: 6,  free: true },
    { id: `${postamatId}-s2`, type: 'shoes', size: '', number: 7,  free: false },
    { id: `${postamatId}-s3`, type: 'shoes', size: '', number: 8,  free: true },
    { id: `${postamatId}-s4`, type: 'shoes', size: '', number: 9,  free: true },
    { id: `${postamatId}-s5`, type: 'shoes', size: '', number: 10, free: false },
  ]
  return [...clothes, ...shoes]
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function ClothesIcon({ color = 'currentColor' }: { color?: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M20.38 3.46L16 2a4 4 0 01-8 0L3.62 3.46a2 2 0 00-1.34 2.23l.58 3.57a1 1 0 00.99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 002-2V10h2.15a1 1 0 00.99-.84l.58-3.57a2 2 0 00-1.34-2.23z" />
    </svg>
  )
}

function ShoesIcon({ color = 'currentColor' }: { color?: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M2 18l1-9 4 3 5-8 6 5h3a1 1 0 010 2l-1 7H2z" />
    </svg>
  )
}

// ─── Cell card ────────────────────────────────────────────────────────────────

function CellCard({
  cell,
  selecting,
  selected,
  onSelect,
}: {
  cell: Cell
  selecting: boolean
  selected: boolean
  onSelect: (id: string) => void
}) {
  const isFree = cell.free
  const isSelectable = selecting && isFree

  const iconColor = selected ? 'white' : isFree ? '#374151' : '#9CA3AF'
  const icon = cell.type === 'clothes'
    ? <ClothesIcon color={iconColor} />
    : <ShoesIcon color={iconColor} />

  let bgClass: string
  let borderClass: string
  if (selected) {
    bgClass = 'bg-[#44973A]'
    borderClass = 'border-[#44973A]'
  } else if (isFree) {
    bgClass = 'bg-white'
    borderClass = isSelectable ? 'border-gray-300' : 'border-gray-200'
  } else {
    bgClass = 'bg-gray-50'
    borderClass = 'border-gray-100'
  }

  const content = (
    <>
      <p class={`text-[10px] font-medium self-end ${selected ? 'text-white/60' : isFree ? 'text-gray-400' : 'text-gray-300'}`}>
        #{cell.number}
      </p>
      {icon}
      {cell.size && (
        <p class={`text-xs font-bold ${selected ? 'text-white' : isFree ? 'text-gray-800' : 'text-gray-300'}`}>
          {cell.size}
        </p>
      )}
      <p class={`text-[10px] font-medium ${selected ? 'text-white/80' : isFree ? 'text-gray-500' : 'text-gray-300'}`}>
        {isFree ? 'Свободна' : 'Занята'}
      </p>
    </>
  )

  if (isSelectable) {
    return (
      <button
        type="button"
        onClick={() => onSelect(cell.id)}
        class={`rounded-2xl border p-3 flex flex-col items-center gap-2 active:scale-[0.97] transition-all ${bgClass} ${borderClass}`}
      >
        {content}
      </button>
    )
  }

  return (
    <div class={`rounded-2xl border p-3 flex flex-col items-center gap-2 ${bgClass} ${borderClass}`}>
      {content}
    </div>
  )
}

// ─── Screen ───────────────────────────────────────────────────────────────────

interface Props {
  postamat: Postamat
  onBack: () => void
}

export function PostamatDetailScreen({ postamat, onBack }: Props) {
  const cells = makeCells(postamat.id)
  const clothesCells = cells.filter(c => c.type === 'clothes')
  const shoesCells = cells.filter(c => c.type === 'shoes')
  const freeCells = cells.filter(c => c.free)

  const [selecting, setSelecting] = useState(false)
  const [selectedCells, setSelectedCells] = useState<Set<string>>(new Set())
  const [booked, setBooked] = useState(false)

  function handleSelect(id: string) {
    setSelectedCells(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function handleConfirm() {
    setBooked(true)
    setSelecting(false)
  }

  function handleCancel() {
    setSelecting(false)
    setSelectedCells(new Set())
  }

  return (
    <div class="min-h-screen bg-white flex flex-col">

      {/* Header */}
      <div class="px-5 pt-12 pb-4 flex items-center gap-4 shrink-0 bg-white border-b border-gray-100">
        <button
          type="button"
          onClick={onBack}
          class="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center active:bg-gray-200 transition-colors text-gray-600 text-lg font-light shrink-0"
        >
          ‹
        </button>
        <div class="flex-1 min-w-0">
          <p class="text-base font-bold text-gray-900 truncate">{postamat.address}</p>
          <p class="text-xs text-gray-400 mt-0.5">{postamat.distance} · {freeCells.length} ячеек свободно</p>
        </div>
      </div>

      {/* Content */}
      <div class="flex-1 overflow-y-auto px-4 pt-5 pb-32">

        {/* Hint when selecting */}
        {selecting && (
          <p class="text-xs text-center text-gray-400 mb-4">
            Выберите свободную ячейку
          </p>
        )}

        {/* Clothes cells */}
        <div class="mb-5">
          <div class="flex items-center gap-2 mb-3">
            <ClothesIcon color="#44973A" />
            <p class="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Одежда</p>
          </div>
          <div class="grid grid-cols-3 gap-2.5">
            {clothesCells.map(c => (
              <CellCard
                key={c.id}
                cell={c}
                selecting={selecting}
                selected={selectedCells.has(c.id)}
                onSelect={handleSelect}
              />
            ))}
          </div>
        </div>

        {/* Shoes cells */}
        <div>
          <div class="flex items-center gap-2 mb-3">
            <ShoesIcon color="#44973A" />
            <p class="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Обувь</p>
          </div>
          <div class="grid grid-cols-3 gap-2.5">
            {shoesCells.map(c => (
              <CellCard
                key={c.id}
                cell={c}
                selecting={selecting}
                selected={selectedCells.has(c.id)}
                onSelect={handleSelect}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Sticky bottom bar */}
      <div class="fixed bottom-0 left-0 right-0 px-4 pb-8 pt-4 bg-white border-t border-gray-100">
        {booked ? (
          <div class="w-full py-4 rounded-2xl bg-[#F0F9EE] flex items-center justify-center gap-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#44973A" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <p class="text-sm font-semibold text-[#44973A]">Забронировано</p>
          </div>
        ) : selecting ? (
          <div class="flex gap-3">
            <button
              type="button"
              onClick={handleCancel}
              class="flex-1 py-4 rounded-2xl bg-gray-100 text-gray-700 text-sm font-semibold active:bg-gray-200 transition-colors"
            >
              Отмена
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={selectedCells.size === 0}
              class="flex-[2] py-4 rounded-2xl bg-[#44973A] text-white text-sm font-semibold active:opacity-90 transition-opacity disabled:bg-[#BDE5B6]"
            >
              Подтвердить
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setSelecting(true)}
            class="w-full py-4 rounded-2xl bg-[#44973A] text-white text-sm font-semibold active:opacity-90 transition-opacity"
          >
            Забронировать
          </button>
        )}
      </div>
    </div>
  )
}
