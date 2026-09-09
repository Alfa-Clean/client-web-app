import { apiFetch } from './client'

export type HousingType = 'apt' | 'house'

export interface Address {
  id: string
  telegram_id: number
  label?: string | null
  address: string
  entrance?: string | null
  floor?: string | null
  apartment?: string | null
  intercom?: string | null
  notes?: string | null
  rooms?: number | null
  bathrooms?: number | null
  housing_type?: HousingType | null
  latitude?: number | null
  longitude?: number | null
  geo_address?: string | null
  created_at: string
}

export interface AddressPayload {
  label?: string
  address: string
  entrance?: string
  floor?: string
  apartment?: string
  intercom?: string
  notes?: string
  rooms?: number
  bathrooms?: number
  housing_type?: HousingType
  latitude?: number
  longitude?: number
}

/**
 * Адреса владельца токена.
 *
 * Идентификатор в путь не передаётся: сервер определяет клиента по JWT. Раньше
 * пути были вида `/users/{telegram_id}/addresses`, и у клиента без Telegram
 * туда уходил ноль — адрес записывался, но не числился ни за кем.
 */
export function getAddresses(): Promise<Address[]> {
  return apiFetch<Address[]>('/me/addresses')
}

export function createAddress(data: AddressPayload): Promise<Address> {
  return apiFetch<Address>('/me/addresses', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function updateAddress(addressId: string, data: AddressPayload): Promise<Address> {
  return apiFetch<Address>(`/me/addresses/${addressId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export function deleteAddress(addressId: string): Promise<void> {
  return apiFetch<void>(`/me/addresses/${addressId}`, {
    method: 'DELETE',
  })
}
