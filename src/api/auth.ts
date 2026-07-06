import { apiFetch, setToken } from './client'
import { mockConfig, MOCK_ENABLED } from '../devMock'

interface TokenResponse {
  access_token: string
  token_type: string
}

export async function loginWithTelegram(initData: string): Promise<void> {
  const { access_token } = await apiFetch<TokenResponse>('/auth/telegram', {
    method: 'POST',
    body: JSON.stringify({ init_data: initData }),
  })
  setToken(access_token)
}

/**
 * Переполучает JWT так же, как при первом запуске (app.tsx): реальный initData
 * из Telegram или подписанный мок в dev. Нужен, когда бэкенд отдал 403/401 на
 * уже открытый Mini App — токен на руках устарел (например, роль/формат sub
 * изменились на бэкенде после его выдачи).
 */
export async function refreshTelegramLogin(): Promise<void> {
  const tg = (window as any).Telegram?.WebApp

  if (MOCK_ENABLED) {
    const params = new URLSearchParams({
      id: String(mockConfig.telegram_id),
      first_name: mockConfig.first_name,
      last_name: mockConfig.last_name,
      username: mockConfig.username,
      lang: mockConfig.language_code,
    })
    if (mockConfig.start_param) params.set('start_param', mockConfig.start_param)
    const signed = await fetch(`/__dev/init-data?${params}`).then(r => r.text())
    // Настоящий telegram-web-app.js (если подключён в index.html) даёт initData
    // только через getter — присвоение бросает TypeError даже вне Telegram.
    // Это не мешает логину: сам signed передаётся в loginWithTelegram напрямую.
    try {
      if (tg) tg.initData = signed
    } catch {
      // read-only initData — игнорируем, ниже используем signed напрямую
    }
    await loginWithTelegram(signed)
    return
  }

  const initData: string = tg?.initData ?? ''
  if (!initData) throw new Error('No Telegram initData available')
  await loginWithTelegram(initData)
}

export async function loginWithServiceKey(telegramId: number): Promise<void> {
  const { access_token } = await apiFetch<TokenResponse>('/auth/dev', {
    method: 'POST',
    body: JSON.stringify({ telegram_id: telegramId }),
  })
  setToken(access_token)
}
