import { useEffect, useRef, useState } from 'preact/hooks'
import { createPortal } from 'preact/compat'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const DEFAULT_LAT = 41.2995
const DEFAULT_LON = 69.2401

interface Props {
  onLocationPick: (lat: number, lon: number) => void
  initialLat?: number | null
  initialLon?: number | null
}

export function MapPicker({ onLocationPick, initialLat, initialLon }: Props) {
  const inlineSlotRef = useRef<HTMLDivElement>(null)
  const overlaySlotRef = useRef<HTMLDivElement>(null)
  const hostRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<L.Map | null>(null)
  const cbRef = useRef(onLocationPick)
  cbRef.current = onLocationPick

  const [expanded, setExpanded] = useState(false)

  // Инициализация карты один раз на отдельном DOM-узле, который мы
  // перемещаем между инлайн-слотом и полноэкранным оверлеем.
  useEffect(() => {
    if (!inlineSlotRef.current) return

    const host = document.createElement('div')
    host.style.width = '100%'
    host.style.height = '100%'
    hostRef.current = host
    inlineSlotRef.current.appendChild(host)

    const lat = initialLat ?? DEFAULT_LAT
    const lon = initialLon ?? DEFAULT_LON

    const map = L.map(host).setView([lat, lon], 15)
    mapRef.current = map

    const isDark = document.documentElement.classList.contains('dark')
    const tileUrl = isDark
      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'

    L.tileLayer(tileUrl, {
      subdomains: 'abcd',
      maxZoom: 20,
      detectRetina: true,
      attribution: '© OpenStreetMap contributors',
    }).addTo(map)

    const marker = L.marker([lat, lon], { draggable: true }).addTo(map)

    marker.on('dragend', () => {
      const { lat, lng } = marker.getLatLng()
      cbRef.current(lat, lng)
    })

    map.on('click', (e: L.LeafletMouseEvent) => {
      marker.setLatLng(e.latlng)
      cbRef.current(e.latlng.lat, e.latlng.lng)
    })

    return () => {
      map.remove()
      host.remove()
      mapRef.current = null
      hostRef.current = null
    }
  }, [])

  // Перемещаем узел карты в нужный слот и пересчитываем размер тайлов.
  useEffect(() => {
    const host = hostRef.current
    const target = expanded ? overlaySlotRef.current : inlineSlotRef.current
    if (!host || !target) return
    if (host.parentElement !== target) target.appendChild(host)
    const id = requestAnimationFrame(() => mapRef.current?.invalidateSize())
    return () => cancelAnimationFrame(id)
  }, [expanded])

  // Закрытие по Esc
  useEffect(() => {
    if (!expanded) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setExpanded(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [expanded])

  const expandIcon = (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
    </svg>
  )
  const collapseIcon = (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M9 9L4 4M9 9V5M9 9H5M15 9l5-5M15 9V5M15 9h4M9 15l-5 5M9 15v4M9 15H5M15 15l5 5M15 15v4M15 15h4" />
    </svg>
  )
  const btnClass =
    'absolute top-3 right-3 z-[1000] flex items-center justify-center w-9 h-9 rounded-lg bg-white/90 shadow-md border border-gray-200 text-gray-900 active:scale-95 transition'

  return (
    <div class="relative w-full h-56 rounded-xl overflow-hidden border border-gray-200 z-0">
      <div ref={inlineSlotRef} class="w-full h-full" />

      {!expanded && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          aria-label="Развернуть карту"
          class={btnClass}
        >
          {expandIcon}
        </button>
      )}

      {expanded &&
        createPortal(
          <div class="fixed inset-0 z-[9999] bg-white">
            <div ref={overlaySlotRef} class="w-full h-full" />
            <button
              type="button"
              onClick={() => setExpanded(false)}
              aria-label="Свернуть карту"
              class={btnClass}
            >
              {collapseIcon}
            </button>
          </div>,
          document.body,
        )}
    </div>
  )
}
