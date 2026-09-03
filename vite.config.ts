import { defineConfig } from 'vite'
import preact from '@preact/preset-vite'
import tailwindcss from '@tailwindcss/vite'
import { cloudflare } from '@cloudflare/vite-plugin'

export default defineConfig({
  plugins: [tailwindcss(), preact(), cloudflare()],
  server: {
    host: true,
    port: 3001,
    allowedHosts: true,
  },
  worker: {
    // Воркер MapLibre — ESM, он создаётся как new Worker(url, { type: 'module' }).
    format: 'es',
  },
  optimizeDeps: {
    // Оптимизатор Vite ломает воркер MapLibre: maplibre-gl-worker.mjs не попадает
    // в .vite/deps, тайлы качаются, но не разбираются — карта показывает только фон.
    exclude: ['maplibre-gl', '@maplibre/maplibre-gl-leaflet'],
  },
})
