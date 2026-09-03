import L from 'leaflet'

/**
 * Базовые карты CARTO — растровые (Leaflet tileLayer) или векторные (MapLibre GL).
 *
 * По умолчанию вектор. Растр остаётся аварийным вариантом: включается
 * принудительно через VITE_BASEMAP_MODE=raster либо сам подхватывается,
 * если WebGL недоступен или MapLibre не загрузился (старый WebView).
 * Переключение не требует правок в компонентах — они вызывают addBasemap().
 *
 * MapLibre грузится динамическим импортом отдельным чанком (~250 КБ gzip),
 * не из основного бандла, и только когда на экране появляется карта.
 *
 * Условия https://carto.com/legal/basemap-terms/: нужен собственный ключ,
 * атрибуция OpenStreetMap + CARTO обязана быть видимой, проксировать тайлы
 * через свой сервер нельзя — ключ уходит с клиента напрямую в CARTO.
 *
 * ВАЖНО: maplibre-gl и мост исключены из optimizeDeps в vite.config.ts —
 * оптимизатор Vite теряет worker-чанк, и карта показывает только фон стиля.
 */

const CARTO_API_KEY = import.meta.env.VITE_CARTO_API_KEY
const MODE = import.meta.env.VITE_BASEMAP_MODE === 'raster' ? 'raster' : 'vector'

/** Сколько ждём первую отрисовку вектора, прежде чем откатиться на растр. */
const VECTOR_RENDER_TIMEOUT_MS = 8000

const RASTER_STYLES = {
  dark: 'dark_all',
  light: 'rastertiles/voyager',
} as const

const VECTOR_STYLES = {
  dark: 'gl/dark-matter-gl-style',
  light: 'gl/voyager-gl-style',
} as const

export const BASEMAP_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors ' +
  '&copy; <a href="https://carto.com/attributions">CARTO</a>'

/** Добавляет ключ к любому запросу в CARTO. */
function withKey(url: string): string {
  if (!CARTO_API_KEY || !url.includes('cartocdn.com')) return url
  return url + (url.includes('?') ? '&' : '?') + `key=${CARTO_API_KEY}`
}

function addRasterBasemap(map: L.Map, isDark: boolean): void {
  const style = isDark ? RASTER_STYLES.dark : RASTER_STYLES.light
  const layer = L.tileLayer(withKey(`https://basemaps.cartocdn.com/${style}/{z}/{x}/{y}{r}.png`), {
    maxZoom: 20,
    detectRetina: true,
    attribution: BASEMAP_ATTRIBUTION,
  })
  // Leaflet молчит при сбое тайлов — без этого получаем пустую карту без причины.
  layer.on('tileerror', e => console.error('[basemap] tile error:', (e as L.TileErrorEvent).coords))
  layer.addTo(map)
}

/** WebGL может отсутствовать в старых WebView — тогда вектор бессмысленен. */
function hasWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas')
    return !!(canvas.getContext('webgl2') || canvas.getContext('webgl'))
  } catch {
    return false
  }
}

async function addVectorBasemap(map: L.Map, isDark: boolean, isCancelled: () => boolean) {
  if (!hasWebGL()) throw new Error('WebGL is unavailable')

  const [{ default: maplibreGL }, maplibregl, { default: workerUrl }] = await Promise.all([
    import('@maplibre/maplibre-gl-leaflet'),
    import('maplibre-gl'),
    import('maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'),
    import('maplibre-gl/dist/maplibre-gl.css'),
  ])
  if (isCancelled()) return

  // MapLibre ищет воркер как new URL('./maplibre-gl-worker.mjs', import.meta.url).
  // Путь собирается в рантайме, бандлер его не видит и файл не эмитит — воркер
  // не поднимается, тайлы качаются, но не разбираются, и карта показывает только
  // фон стиля. Отдаём собранный Vite адрес явно.
  maplibregl.setWorkerUrl(workerUrl)

  const style = isDark ? VECTOR_STYLES.dark : VECTOR_STYLES.light
  const layer = maplibreGL({
    style: `https://basemaps.cartocdn.com/${style}/style.json`,
    // Ключ на вектор CARTO пока не требует, но обещали включить. transformRequest
    // покрывает и style.json, и тайлы, и спрайты со шрифтами разом.
    transformRequest: (url: string) => ({ url: withKey(url) }),
    // Атрибуцию показывает Leaflet — иначе получим две плашки.
    attributionControl: false,
  })
  layer.addTo(map)
  map.attributionControl?.addAttribution(BASEMAP_ATTRIBUTION)

  // MapLibre не бросает исключений на ошибках стиля, тайлов и WebGL — только
  // событие 'error'. Без этого обработчика сбой выглядит как пустая карта.
  const gl = layer.getMaplibreMap()
  gl.on('error', e => console.error('[basemap] maplibre error:', e?.error ?? e))

  // Сторожевой таймер. Отдельный класс отказов (например, неподнявшийся worker,
  // который разбирает тайлы) не даёт ни исключения, ни события 'error': карта
  // рисует фон стиля и остаётся пустой навсегда. Ловим по факту отрисовки.
  setTimeout(() => {
    if (isCancelled() || !map.hasLayer(layer)) return
    if (gl.queryRenderedFeatures().length > 0) return

    console.warn('[basemap] vector rendered nothing, falling back to raster', {
      styleLoaded: gl.isStyleLoaded(),
      tilesLoaded: gl.areTilesLoaded(),
      sources: Object.keys(gl.getStyle()?.sources ?? {}),
    })
    map.removeLayer(layer)
    map.attributionControl?.removeAttribution(BASEMAP_ATTRIBUTION)
    addRasterBasemap(map, isDark)
  }, VECTOR_RENDER_TIMEOUT_MS)
}

/**
 * Добавляет базовый слой на карту. Возвращает функцию отмены — её нужно
 * вызвать в cleanup useEffect, чтобы асинхронный векторный слой не сел
 * на уже уничтоженную карту.
 */
export function addBasemap(map: L.Map, isDark: boolean): () => void {
  let cancelled = false

  if (MODE === 'raster') {
    addRasterBasemap(map, isDark)
  } else {
    addVectorBasemap(map, isDark, () => cancelled).catch((err: unknown) => {
      if (cancelled) return
      console.warn('[basemap] vector unavailable, falling back to raster', err)
      addRasterBasemap(map, isDark)
    })
  }

  return () => { cancelled = true }
}
