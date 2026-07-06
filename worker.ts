interface Env {
  ASSETS: Fetcher
  BACKEND_URL: string
  SERVICE_KEY?: string
  /** Только для dev (.dev.vars). В прод-деплое воркера отсутствует. */
  BOT_TOKEN?: string
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    // ─── Dev-only: подпись мокового Telegram initData ──────────────────────────
    // Позволяет логиниться через настоящий /auth/telegram без Telegram-клиента.
    // Доступен только когда BOT_TOKEN задан (есть лишь в .dev.vars, не в прод).
    if (url.pathname === '/__dev/init-data') {
      if (!env.BOT_TOKEN) {
        return new Response('Not found', { status: 404 })
      }
      const initData = await buildSignedInitData(url.searchParams, env.BOT_TOKEN)
      return new Response(initData, {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      })
    }

    if (url.pathname.startsWith('/api/')) {
      const target = env.BACKEND_URL.replace(/\/$/, '')
      const backendUrl = target + url.pathname + url.search

      const headers = new Headers(request.headers)
      if (env.SERVICE_KEY) {
        headers.set('X-Service-Key', env.SERVICE_KEY)
      }

      const proxied = new Request(backendUrl, {
        method: request.method,
        headers,
        body: request.body,
        redirect: 'follow',
      })

      return fetch(proxied)
    }

    return env.ASSETS.fetch(request)
  },
}

/**
 * Собирает и подписывает Telegram WebApp initData по официальной схеме:
 *   secret_key        = HMAC_SHA256(key="WebAppData", msg=bot_token)
 *   hash              = HMAC_SHA256(key=secret_key, msg=data_check_string)
 *   data_check_string = "\n".join(sorted "key=value", кроме hash)
 */
async function buildSignedInitData(q: URLSearchParams, botToken: string): Promise<string> {
  const user = {
    id: Number(q.get('id') ?? '0'),
    first_name: q.get('first_name') ?? 'Dev',
    last_name: q.get('last_name') ?? 'User',
    username: q.get('username') ?? 'devuser',
    language_code: q.get('lang') ?? 'ru',
  }

  // Значения здесь — декодированные (как их видит backend после parse_qsl).
  const params: Record<string, string> = {
    auth_date: String(Math.floor(Date.now() / 1000)),
    query_id: 'AAEdevQueryId',
    user: JSON.stringify(user),
  }
  const startParam = q.get('start_param')
  if (startParam) params.start_param = startParam

  const dataCheckString = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join('\n')

  const secretKey = await hmacSha256(textBytes('WebAppData'), textBytes(botToken))
  const hashBytes = await hmacSha256(secretKey, textBytes(dataCheckString))
  const hash = toHex(hashBytes)

  const out = new URLSearchParams(params)
  out.set('hash', hash)
  return out.toString()
}

function textBytes(s: string): Uint8Array {
  return new TextEncoder().encode(s)
}

async function hmacSha256(keyBytes: Uint8Array, msgBytes: Uint8Array): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, msgBytes)
  return new Uint8Array(sig)
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}
