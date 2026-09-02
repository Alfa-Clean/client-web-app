import { apiFetch } from './client'
import type { Lang } from '../i18n/locales'

export async function reverseGeocode(
  lat: number,
  lon: number,
  lang: Lang = 'ru',
): Promise<string | null> {
  const data = await apiFetch<{ address: string | null }>(
    `/geocode/reverse?lat=${lat}&lon=${lon}&lang=${lang}`,
  )
  return data.address
}
