import { apiFetch } from './client'

export async function reverseGeocode(lat: number, lon: number): Promise<string | null> {
  const data = await apiFetch<{ address: string | null }>(
    `/geocode/reverse?lat=${lat}&lon=${lon}`,
  )
  return data.address
}
