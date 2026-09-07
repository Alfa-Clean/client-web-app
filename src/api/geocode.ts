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

/**
 * Координаты по строке адреса. `null` — Яндекс не распознал строку.
 *
 * Город подставляет бэкенд (`_with_default_city`), писать «Ташкент» в поле
 * не нужно.
 */
export async function forwardGeocode(
  address: string,
  lang: Lang = 'ru',
): Promise<{ lat: number; lon: number } | null> {
  const data = await apiFetch<{ lat: number | null; lon: number | null }>(
    `/geocode/forward?address=${encodeURIComponent(address)}&lang=${lang}`,
  )
  if (data.lat === null || data.lon === null) return null
  return { lat: data.lat, lon: data.lon }
}
