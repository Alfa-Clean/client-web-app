import { useState } from 'preact/hooks'
import type { Theme } from '../hooks/useTheme'
import type { User } from '../types'
import type { Address, AddressPayload } from '../api/addresses'
import { createAddress, deleteAddress, updateAddress } from '../api/addresses'
import { useAddresses } from '../hooks/useAddresses'
import { useLocale } from '../i18n'
import type { Lang } from '../i18n/locales'
import { getTheme, setTheme } from '../hooks/useTheme'
import { AddressFormScreen } from './AddressFormScreen'
import { OrderScreen } from './OrderScreen'
import { BottomBar } from '../components/BottomBar'
import type { Tab } from '../components/BottomBar'

type View =
  | { name: 'list' }
  | { name: 'form'; address?: Address }
  | { name: 'new_order' }

interface Props {
  user: User
}

export function HomeScreen({ user }: Props) {
  const [tab, setTab] = useState<Tab>('orders')
  const [view, setView] = useState<View>({ name: 'list' })
  const { state, reload } = useAddresses(user.telegram_id)
  const { t } = useLocale()

  async function handleCreate(data: AddressPayload) {
    await createAddress(user.telegram_id, data)
    reload()
  }

  async function handleUpdate(address: Address, data: AddressPayload) {
    await updateAddress(user.telegram_id, address.id, data)
    reload()
  }

  async function handleDelete(address: Address) {
    if (!confirm(t('home_delete_confirm', { address: address.address }))) return
    await deleteAddress(user.telegram_id, address.id)
    reload()
  }

  if (view.name === 'form') {
    const editing = view.address
    return (
      <AddressFormScreen
        initial={editing}
        onSubmit={data => editing ? handleUpdate(editing, data) : handleCreate(data)}
        onBack={() => setView({ name: 'list' })}
      />
    )
  }

  if (view.name === 'new_order') {
    return <OrderScreen user={user} onBack={() => setView({ name: 'list' })} />
  }

  return (
    <div class="min-h-screen bg-gray-50 flex flex-col">
      <div class="flex-1 overflow-y-auto">
        {tab === 'addresses' && (
          <AddressesTab
            state={state}
            onAdd={() => setView({ name: 'form' })}
            onEdit={addr => setView({ name: 'form', address: addr })}
            onDelete={handleDelete}
          />
        )}
        {tab === 'orders' && <OrdersTab onNewOrder={() => setView({ name: 'new_order' })} />}
        {tab === 'settings' && <SettingsTab user={user} />}
      </div>

      <BottomBar active={tab} onChange={t => { setTab(t); setView({ name: 'list' }) }} />
    </div>
  )
}

// ─── Tabs ────────────────────────────────────────────────────────────────────

interface AddressesTabProps {
  state: ReturnType<typeof useAddresses>['state']
  onAdd: () => void
  onEdit: (addr: Address) => void
  onDelete: (addr: Address) => void
}

function AddressesTab({ state, onAdd, onEdit, onDelete }: AddressesTabProps) {
  const { t } = useLocale()
  return (
    <div class="px-4 py-5 flex flex-col">
      <div class="flex items-center justify-between mb-3">
        <h2 class="text-sm font-medium text-gray-500">{t('home_saved_addresses')}</h2>
        <button type="button" onClick={onAdd} class="text-blue-600 text-sm font-medium">
          {t('home_add_address')}
        </button>
      </div>

      {state.status === 'loading' && (
        <p class="text-sm text-gray-400">{t('btn_loading')}</p>
      )}

      {state.status === 'error' && (
        <p class="text-sm text-red-500">{state.message}</p>
      )}

      {state.status === 'success' && state.data.length === 0 && (
        <div class="flex-1 flex flex-col items-center justify-center gap-2 text-center py-16">
          <p class="text-gray-400 text-sm">{t('home_no_addresses')}</p>
          <button type="button" onClick={onAdd} class="text-blue-600 text-sm font-medium">
            {t('home_add_first')}
          </button>
        </div>
      )}

      {state.status === 'success' && state.data.map(addr => (
        <div key={addr.id} class="bg-white rounded-xl p-4 mb-2 border border-gray-100">
          <div class="flex items-start justify-between gap-2">
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-gray-900 truncate">{addr.address}</p>
              {(addr.apartment || addr.floor || addr.entrance) && (
                <p class="text-xs text-gray-400 mt-0.5">
                  {[
                    addr.entrance && t('home_entrance', { n: addr.entrance }),
                    addr.floor && t('home_floor', { n: addr.floor }),
                    addr.apartment && t('home_apt', { n: addr.apartment }),
                  ].filter(Boolean).join(', ')}
                </p>
              )}
              {addr.intercom && (
                <p class="text-xs text-gray-400">{t('home_intercom', { n: addr.intercom })}</p>
              )}
              {(addr.rooms != null || addr.bathrooms != null || addr.housing_type) && (
                <p class="text-xs text-gray-400 mt-0.5">
                  {[
                    addr.housing_type && t(`housing_${addr.housing_type}`),
                    addr.rooms && `${addr.rooms} ${t('home_rooms_short')}`,
                    addr.bathrooms && `${addr.bathrooms} ${t('home_bathrooms_short')}`,
                  ].filter(Boolean).join(' · ')}
                </p>
              )}
            </div>
            <div class="flex gap-3 shrink-0">
              <button
                type="button"
                onClick={() => onEdit(addr)}
                class="text-xs text-blue-600 font-medium"
              >
                {t('btn_edit')}
              </button>
              <button
                type="button"
                onClick={() => onDelete(addr)}
                class="text-xs text-red-500 font-medium"
              >
                {t('btn_delete')}
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function OrdersTab({ onNewOrder }: { onNewOrder: () => void }) {
  const { t } = useLocale()
  return (
    <div class="flex-1 flex flex-col items-center justify-center gap-4 py-24 text-center px-4">
      <p class="text-gray-400 text-sm">{t('home_no_orders')}</p>
      <button
        type="button"
        onClick={onNewOrder}
        class="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-3 rounded-xl transition-colors text-sm"
      >
        {t('home_order_now')}
      </button>
    </div>
  )
}

const LANGS: { id: Lang; flag: string }[] = [
  { id: 'ru', flag: '🇷🇺' },
  { id: 'uz', flag: '🇺🇿' },
  { id: 'en', flag: '🇬🇧' },
]

function SettingsTab({ user }: { user: User }) {
  const { t, lang, setLang } = useLocale()
  const [theme, setThemeState] = useState(getTheme())

  function toggleTheme() {
    const next = theme === 'light' ? 'dark' : 'light'
    setTheme(next)
    setThemeState(next)
  }

  return (
    <div class="px-4 py-5 flex flex-col gap-4">
      <div class="bg-white rounded-xl p-4 border border-gray-100">
        <p class="text-sm font-medium text-gray-900">{user.first_name} {user.last_name}</p>
        {user.phone && <p class="text-xs text-gray-400 mt-0.5">{user.phone}</p>}
      </div>

      <div class="bg-white rounded-xl p-4 border border-gray-100">
        <p class="text-xs font-medium text-gray-500 mb-3">{t('settings_language')}</p>
        <div class="flex gap-2">
          {LANGS.map(({ id, flag }) => (
            <button
              key={id}
              type="button"
              onClick={() => setLang(id)}
              class={`flex-1 flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 transition-colors ${
                lang === id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 bg-gray-50'
              }`}
            >
              <span class="text-2xl leading-none">{flag}</span>
              <span class={`text-xs font-medium ${lang === id ? 'text-blue-700' : 'text-gray-500'}`}>
                {t(`lang_${id}`)}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div class="bg-white rounded-xl p-4 border border-gray-100">
        <div class="flex items-center justify-between">
          <span class="text-sm font-medium text-gray-900">
            {theme === 'dark' ? '🌙' : '☀️'} {theme === 'dark' ? 'Тёмная тема' : 'Светлая тема'}
          </span>
          <button
            type="button"
            onClick={toggleTheme}
            style={`width:48px;height:28px;border-radius:14px;position:relative;transition:background 0.2s;background:${theme === 'dark' ? '#0a84ff' : '#d1d5db'}`}
          >
            <span style={`position:absolute;top:3px;width:22px;height:22px;border-radius:50%;background:white;box-shadow:0 1px 3px rgba(0,0,0,.3);transition:left 0.2s;left:${theme === 'dark' ? '23px' : '3px'}`} />
          </button>
        </div>
      </div>
    </div>
  )
}
