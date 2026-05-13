import { apiFetch } from './client'
import type { Lang } from '../i18n/locales'

export function updateLanguage(telegramId: number, languageCode: Lang): Promise<{ telegram_id: number; language_code: Lang }> {
  return apiFetch(`/clients/${telegramId}/language`, {
    method: 'PATCH',
    body: JSON.stringify({ language_code: languageCode }),
  })
}
