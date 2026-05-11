type Tab = 'orders' | 'addresses' | 'settings'

interface Props {
  active: Tab
  onChange: (tab: Tab) => void
}

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'orders',    label: 'Заказы',    icon: '🧹' },
  { id: 'addresses', label: 'Адреса',    icon: '📍' },
  { id: 'settings',  label: 'Настройки', icon: '⚙️' },
]

export function BottomBar({ active, onChange }: Props) {
  return (
    <nav class="bg-white border-t border-gray-100 flex safe-bottom">
      {TABS.map(tab => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          class={`flex-1 flex flex-col items-center gap-1 py-2.5 transition-colors ${
            active === tab.id ? 'text-blue-600' : 'text-gray-400'
          }`}
        >
          <span class="text-xl leading-none">{tab.icon}</span>
          <span class="text-[10px] font-medium">{tab.label}</span>
        </button>
      ))}
    </nav>
  )
}

export type { Tab }
