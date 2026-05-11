import { apiFetch } from './client'

export interface Addon {
  id: string
  name_ru: string
  name_uz?: string
  price: number
}

export function getAddons(): Promise<Addon[]> {
  return apiFetch<Addon[]>('/addons?is_active=true&visibility=bot')
}
