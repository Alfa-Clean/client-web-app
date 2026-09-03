import L from 'leaflet'
import iconUrl from 'leaflet/dist/images/marker-icon.png'
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png'
import shadowUrl from 'leaflet/dist/images/marker-shadow.png'

/**
 * Leaflet ищет картинки маркера относительно своего CSS (L.Icon.Default.imagePath).
 * После сборки бандлером путь неверен и иконка приезжает битой. Убираем встроенный
 * резолвер и задаём адреса явно — Vite подставит хешированные пути.
 *
 * Импортировать один раз ради сайд-эффекта в любом модуле, который создаёт L.marker
 * без собственной иконки.
 */
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl

L.Icon.Default.mergeOptions({ iconUrl, iconRetinaUrl, shadowUrl })
