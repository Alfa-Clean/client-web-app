interface Env {
  ASSETS: Fetcher
  BACKEND_URL: string
  SERVICE_KEY?: string
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    if (url.pathname.startsWith('/api/')) {
      const target = env.BACKEND_URL.replace(/\/$/, '')
      const backendPath = url.pathname.slice(4) // strip /api
      const backendUrl = target + backendPath + url.search

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
