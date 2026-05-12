import { apiFetch } from './client'

export type HousingType = 'apt' | 'house'

export interface Address {
  id: string
  telegram_id: number
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

export function getAddresses(telegramId: number): Promise<Address[]> {
  return apiFetch<Address[]>(`/users/${telegramId}/addresses`)
}

export function createAddress(telegramId: number, data: AddressPayload): Promise<Address> {
  return apiFetch<Address>(`/users/${telegramId}/addresses`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function updateAddress(
  telegramId: number,
  addressId: string,
  data: AddressPayload,
): Promise<Address> {
  return apiFetch<Address>(`/users/${telegramId}/addresses/${addressId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export function deleteAddress(telegramId: number, addressId: string): Promise<void> {
  return apiFetch<void>(`/users/${telegramId}/addresses/${addressId}`, {
    method: 'DELETE',
  })
}
