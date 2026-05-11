import { useEffect, useRef } from 'preact/hooks'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Ташкент по умолчанию
const DEFAULT_LAT = 41.2995
const DEFAULT_LON = 69.2401

interface Props {
  onLocationPick: (lat: number, lon: number) => void
}

export function MapPicker({ onLocationPick }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const map = L.map(containerRef.current).setView([DEFAULT_LAT, DEFAULT_LON], 13)

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
    }).addTo(map)

    const marker = L.marker([DEFAULT_LAT, DEFAULT_LON], { draggable: true }).addTo(map)

    marker.on('dragend', () => {
      const { lat, lng } = marker.getLatLng()
      onLocationPick(lat, lng)
    })

    map.on('click', (e: L.LeafletMouseEvent) => {
      marker.setLatLng(e.latlng)
      onLocationPick(e.latlng.lat, e.latlng.lng)
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
