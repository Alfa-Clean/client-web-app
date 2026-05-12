import { useEffect, useRef } from 'preact/hooks'

import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Ташкент по умолчанию
const DEFAULT_LAT = 41.2995
const DEFAULT_LON = 69.2401

interface Props {
  onLocationPick: (lat: number, lon: number) => void
  initialLat?: number | null
  initialLon?: number | null
}

export function MapPicker({ onLocationPick, initialLat, initialLon }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const cbRef = useRef(onLocationPick)
  cbRef.current = onLocationPick

  useEffect(() => {
    if (!containerRef.current) return

    const lat = initialLat ?? DEFAULT_LAT
    const lon = initialLon ?? DEFAULT_LON

    const map = L.map(containerRef.current).setView([lat, lon], 15)

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
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
    }
  }, [])

  return (
    <div
      ref={containerRef}
      class="w-full h-56 rounded-xl overflow-hidden border border-gray-200 z-0"
    />
  )
}
