import { defineConfig, loadEnv } from 'vite'
import preact from '@preact/preset-vite'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  const apiTarget = env.API_URL ?? 'https://dev.tusamaker.uz'

  const devProxy = {
    target: apiTarget,
    changeOrigin: true,
    headers: { 'X-Service-Key': env.SERVICE_KEY ?? '' },
  }

  return {
    plugins: [tailwindcss(), preact()],
    server: {
      port: 3000,
      allowedHosts: true,
      proxy: {
        '/users': devProxy,
        '/orders': devProxy,
        '/addons': devProxy,
        '/executors': devProxy,
        '/addresses': devProxy,
        '/clients': devProxy,
        '/auth': { target: apiTarget, changeOrigin: true },
        '/geocode': devProxy,
      },
    },
  }
})
