import { apiFetch, setToken } from './client'

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

export async function loginWithServiceKey(telegramId: number): Promise<void> {
  const { access_token } = await apiFetch<TokenResponse>('/auth/dev', {
    method: 'POST',
    body: JSON.stringify({ telegram_id: telegramId }),
  })
  setToken(access_token)
}
