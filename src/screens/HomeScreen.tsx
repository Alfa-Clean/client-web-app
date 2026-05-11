import { useState } from 'preact/hooks'
import type { User } from '../types'
import type { Address, AddressPayload } from '../api/addresses'
import { createAddress, deleteAddress, updateAddress } from '../api/addresses'
import { useAddresses } from '../hooks/useAddresses'
import { AddressFormScreen } from './AddressFormScreen'
import { BottomBar } from '../components/BottomBar'
import type { Tab } from '../components/BottomBar'

type View =
  | { name: 'list' }
  | { name: 'form'; address?: Address }

interface Props {
  user: User
}

export function HomeScreen({ user }: Props) {
  const [tab, setTab] = useState<Tab>('addresses')
  const [view, setView] = useState<View>({ name: 'list' })
  const { state, reload } = useAddresses(user.telegram_id)

  async function handleCreate(data: AddressPayload) {
    await createAddress(user.telegram_id, data)
    reload()
  }

  async function handleUpdate(address: Address, data: AddressPayload) {
    await updateAddress(user.telegram_id, address.id, data)
    reload()
  }

  async function handleDelete(address: Address) {
    if (!confirm(`Удалить адрес?\n${address.address}`)) return
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

  return (
    <div class="min-h-screen bg-gray-50 flex flex-col">
      <div class="bg-white px-4 py-5 border-b border-gray-100">
        <p class="text-xs text-gray-400 mb-0.5">Добро пожаловать</p>
        <h1 class="text-lg font-semibold text-gray-900">{user.first_name}</h1>
      </div>

      <div class="flex-1 overflow-y-auto">
        {tab === 'addresses' && (
          <AddressesTab
            state={state}
            onAdd={() => setView({ name: 'form' })}
            onEdit={addr => setView({ name: 'form', address: addr })}
            onDelete={handleDelete}
          />
        )}
        {tab === 'orders' && <OrdersTab />}
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
  return (
    <div class="px-4 py-5 flex flex-col">
      <div class="flex items-center justify-between mb-3">
        <h2 class="text-sm font-medium text-gray-500">Сохранённые адреса</h2>
        <button type="button" onClick={onAdd} class="text-blue-600 text-sm font-medium">
          + Добавить
        </button>
      </div>

      {state.status === 'loading' && (
        <p class="text-sm text-gray-400">Загрузка...</p>
      )}

      {state.status === 'error' && (
        <p class="text-sm text-red-500">{state.message}</p>
      )}

      {state.status === 'success' && state.data.length === 0 && (
        <div class="flex-1 flex flex-col items-center justify-center gap-2 text-center py-16">
          <p class="text-gray-400 text-sm">Нет сохранённых адресов</p>
          <button type="button" onClick={onAdd} class="text-blue-600 text-sm font-medium">
            Добавить первый адрес
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
                    addr.entrance && `подъезд ${addr.entrance}`,
                    addr.floor && `эт. ${addr.floor}`,
                    addr.apartment && `кв. ${addr.apartment}`,
                  ].filter(Boolean).join(', ')}
                </p>
              )}
              {addr.intercom && (
                <p class="text-xs text-gray-400">домофон: {addr.intercom}</p>
              )}
              {(addr.rooms != null || addr.bathrooms != null) && (
                <p class="text-xs text-gray-400 mt-0.5">
                  {[
                    addr.rooms && `${addr.rooms} комн.`,
                    addr.bathrooms && `${addr.bathrooms} санузл.`,
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
                Изменить
              </button>
              <button
                type="button"
                onClick={() => onDelete(addr)}
                class="text-xs text-red-500 font-medium"
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function OrdersTab() {
  return (
    <div class="flex-1 flex flex-col items-center justify-center gap-2 py-24 text-center px-4">
      <p class="text-gray-400 text-sm">Здесь будут ваши заказы</p>
    </div>
  )
}

function SettingsTab({ user }: { user: User }) {
  return (
    <div class="px-4 py-5">
      <div class="bg-white rounded-xl p-4 border border-gray-100">
        <p class="text-sm font-medium text-gray-900">{user.first_name} {user.last_name}</p>
        {user.phone && <p class="text-xs text-gray-400 mt-0.5">{user.phone}</p>}
      </div>
    </div>
  )
}
