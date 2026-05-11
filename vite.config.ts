import { defineConfig, loadEnv } from 'vite'
import preact from '@preact/preset-vite'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  const devProxy = {
    target: 'http://localhost:8000',
    changeOrigin: true,
    headers: { 'X-Service-Key': env.SERVICE_KEY ?? '' },
  }

  return {
    plugins: [tailwindcss(), preact()],
    server: {
      proxy: {
        '/users': devProxy,
        '/orders': devProxy,
        '/addons': devProxy,
        '/auth': { target: 'http://localhost:8000', changeOrigin: true },
        '/geocode': devProxy,
      },
    },
  }
})
