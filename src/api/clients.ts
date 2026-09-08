import { apiFetch } from './client'
import type { Lang } from '../i18n/locales'

export function updateLanguage(languageCode: Lang): Promise<{ telegram_id: number; language_code: Lang }> {
  return apiFetch('/me/language', {
    method: 'PATCH',
    body: JSON.stringify({ language_code: languageCode }),
  })
}
