import { apiFetch } from './client'

export interface Addon {
  id: string
  translations: Record<string, string>
  price: number
  category_id?: string | null
}

export interface HandymanWork {
  id: string
  translations: Record<string, string>
  description_translations: Record<string, string>
  price: number
  unit_id: string | null
  note: string | null
  category_id: string | null
  is_active: boolean
  sort_order: number
  created_at: string
}

export interface AddonCategory {
  id: string
  translations: Record<string, string>
  sort_order: number
}

export function addonLabel(addon: Addon, lang: string): string {
  return addon.translations[lang] ?? addon.translations['ru'] ?? addon.id
}

export function getAddons(): Promise<Addon[]> {
  return apiFetch<Addon[]>('/cleaning/addons?is_active=true&visibility=app')
}

export function getAddonCategories(): Promise<AddonCategory[]> {
  return apiFetch<AddonCategory[]>('/cleaning/addon-categories')
}

export function getHandymanWorks(): Promise<HandymanWork[]> {
  return apiFetch<HandymanWork[]>('/handyman/works?is_active=true')
}
