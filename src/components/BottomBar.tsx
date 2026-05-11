import { useLocale } from '../i18n'

type Tab = 'orders' | 'addresses' | 'settings'

interface Props {
  active: Tab
  onChange: (tab: Tab) => void
}

export function BottomBar({ active, onChange }: Props) {
  const { t } = useLocale()

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'orders',    label: t('tab_orders'),    icon: '🧹' },
    { id: 'addresses', label: t('tab_addresses'), icon: '📍' },
    { id: 'settings',  label: t('tab_settings'),  icon: '⚙️' },
  ]

  return (
    <nav class="bg-white border-t border-gray-100 flex safe-bottom">
      {tabs.map(tab => (
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
