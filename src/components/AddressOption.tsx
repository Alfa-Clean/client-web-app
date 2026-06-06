interface Props {
  address: string
  label?: string | null
  housingType?: 'apt' | 'house'
  active?: boolean
  onClick: () => void
}

export function AddressOption({ address, label, housingType = 'apt', active = false, onClick }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      class={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-b border-gray-50 last:border-0 ${
        active ? 'bg-gray-50' : 'active:bg-gray-50'
      }`}
    >
      <span class={`shrink-0 ${active ? 'text-gray-500' : 'text-gray-300'}`}>
        {housingType === 'house' ? (
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M2 8.5L9 2l7 6.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M4 7v8h10V7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            <rect x="6.5" y="11" width="5" height="4" rx="0.5" stroke="currentColor" stroke-width="1.3"/>
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <rect x="2" y="2" width="14" height="14" rx="2" stroke="currentColor" stroke-width="1.5"/>
            <path d="M6 2v14" stroke="currentColor" stroke-width="1.3" stroke-dasharray="2 2"/>
            <path d="M12 2v14" stroke="currentColor" stroke-width="1.3" stroke-dasharray="2 2"/>
            <path d="M2 7h14M2 12h14" stroke="currentColor" stroke-width="1.3" stroke-dasharray="2 2"/>
          </svg>
        )}
      </span>
      <div class="flex-1 min-w-0">
        <p class={`text-sm font-medium truncate text-gray-900`}>
          {label || address}
        </p>
        {label && <p class="text-xs text-gray-400 mt-0.5 truncate">{address}</p>}
      </div>
      {active && (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" class="shrink-0 text-gray-400">
          <path d="M3 8l4 4 6-7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      )}
    </button>
  )
}
