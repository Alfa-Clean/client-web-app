import { useEffect, useRef, useState } from 'preact/hooks'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { PostamatDetailScreen } from './PostamatDetailScreen'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Postamat {
  id: number
  lat: number
  lon: number
  address: string
  distance: string
}

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_POSTAMATS: (Postamat & { free: boolean })[] = [
  { id: 1, lat: 41.2995, lon: 69.2401, address: 'ТЦ Samarqand Darvoza, 1 этаж', distance: '200 м', free: true },
  { id: 2, lat: 41.3020, lon: 69.2450, address: 'ул. Навои, 30',                 distance: '450 м', free: true },
  { id: 3, lat: 41.2965, lon: 69.2360, address: 'ТЦ Komplex, вход со двора',     distance: '1.2 км', free: false },
  { id: 4, lat: 41.3040, lon: 69.2380, address: 'Юнусабад, 19-квартал, 8',       distance: '1.8 км', free: true },
]

// ─── Map ──────────────────────────────────────────────────────────────────────

const PIN_HTML = `
  <div style="
    width:28px;height:28px;
    background:#44973A;
    border-radius:50% 50% 50% 0;
    transform:rotate(-45deg);
    border:3px solid white;
    box-shadow:0 2px 6px rgba(0,0,0,.25)
  "></div>
`

function PostamatMap() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current) return

    const map = L.map(ref.current, { zoomControl: false }).setView([41.2995, 69.2401], 14)

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
    }).addTo(map)

    const icon = L.divIcon({
      className: '',
      html: PIN_HTML,
      iconSize: [28, 28],
      iconAnchor: [14, 28],
      popupAnchor: [0, -30],
    })

    MOCK_POSTAMATS.forEach(p => {
      L.marker([p.lat, p.lon], { icon })
        .addTo(map)
        .bindPopup(`<b style="font-size:13px">${p.address}</b>`)
    })

    return () => { map.remove() }
  }, [])

  return <div ref={ref} style="height:60vh;width:100%" class="z-0" />
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function ScanIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="3" y="3" width="5" height="5" rx="1" />
      <rect x="16" y="3" width="5" height="5" rx="1" />
      <rect x="3" y="16" width="5" height="5" rx="1" />
      <path d="M21 16h-3v3" />
      <path d="M21 21h-3" />
      <path d="M16 21v-3" />
      <line x1="3" y1="12" x2="21" y2="12" />
    </svg>
  )
}

// ─── Postamat List Item ───────────────────────────────────────────────────────

function PostamatItem({ postamat, onClick }: { postamat: Postamat; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      class="flex items-center gap-3 px-4 py-3.5 bg-gray-50 rounded-2xl active:bg-gray-100 transition-colors text-left w-full"
    >
      <div class="w-10 h-10 rounded-xl bg-[#F0F9EE] flex items-center justify-center shrink-0">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#44973A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M9 3v18" />
          <path d="M3 9h6" />
          <path d="M3 15h6" />
        </svg>
      </div>
      <div class="flex-1 min-w-0">
        <p class="text-sm font-semibold text-gray-900 truncate">{postamat.address}</p>
        <p class="text-xs mt-0.5 font-medium text-[#44973A]">Свободен</p>
      </div>
      <span class="text-xs font-semibold text-[#44973A] shrink-0">{postamat.distance}</span>
    </button>
  )
}

// ─── Screen ───────────────────────────────────────────────────────────────────

interface Props {
  onBack: () => void
}

export function ChistomatyScreen({ onBack }: Props) {
  const [selected, setSelected] = useState<Postamat | null>(null)

  if (selected) {
    return <PostamatDetailScreen postamat={selected} onBack={() => setSelected(null)} />
  }

  const freePostamats = MOCK_POSTAMATS.filter(p => p.free)

  return (
    <div class="min-h-screen bg-white flex flex-col">

      {/* Header */}
      <div class="px-5 pt-12 pb-4 flex items-center gap-4 shrink-0 bg-white">
        <button
          type="button"
          onClick={onBack}
          class="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center active:bg-gray-200 transition-colors text-gray-600 text-lg font-light"
        >
          ‹
        </button>
        <p class="text-xl font-bold text-gray-900">Чистоматы</p>
      </div>

      {/* Map — 60vh */}
      <div class="shrink-0">
        <PostamatMap />
      </div>

      {/* Bottom section */}
      <div class="flex-1 overflow-y-auto px-4 pt-4 pb-8">

        {/* Scan shortcut */}
        <button
          type="button"
          class="w-full flex items-center justify-center gap-2.5 py-3.5 mb-6 rounded-2xl border-2 border-gray-200 text-gray-700 font-semibold text-sm active:bg-gray-50 transition-colors"
        >
          <ScanIcon />
          Отсканировать QR-код
        </button>

        {/* Nearby list */}
        <p class="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-3">
          Ближайшие чистоматы
        </p>
        <div class="flex flex-col gap-2">
          {freePostamats.map(p => (
            <PostamatItem key={p.id} postamat={p} onClick={() => setSelected(p)} />
          ))}
        </div>
      </div>
    </div>
  )
}
