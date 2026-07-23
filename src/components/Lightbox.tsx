import { useState } from 'preact/hooks'
import { createPortal } from 'preact/compat'
import { ZoomableImage } from './ZoomableImage'

export interface LightboxItem {
  id: string
  url: string
  media_type: string
}

interface Props {
  attachments: LightboxItem[]
  initialIdx: number
  onClose: () => void
}

/**
 * Полноэкранный просмотр фото/видео: свайп-листание, счётчик, стрелки,
 * pinch-to-zoom для картинок. Рендерится порталом в body, чтобы не перекрывалось.
 */
export function Lightbox({ attachments, initialIdx, onClose }: Props) {
  const [idx, setIdx] = useState(initialIdx)
  const [touchStartX, setTouchStartX] = useState<number | null>(null)
  const [zoomed, setZoomed] = useState(false)
  const att = attachments[idx]
  const isVideo = att.media_type.startsWith('video/')

  const prev = () => setIdx((i) => Math.max(0, i - 1))
  const next = () => setIdx((i) => Math.min(attachments.length - 1, i + 1))

  return createPortal(
    <div
      class="fixed inset-0 z-9999 bg-black/70 flex flex-col select-none"
      onTouchStart={(e) => {
        // свайп-листание только одним пальцем и без активного зума
        if (e.touches.length !== 1 || zoomed) {
          setTouchStartX(null)
          return
        }
        setTouchStartX(e.touches[0].clientX)
      }}
      onTouchEnd={(e) => {
        if (touchStartX === null || zoomed) return
        const dx = e.changedTouches[0].clientX - touchStartX
        if (dx > 50) prev()
        else if (dx < -50) next()
        setTouchStartX(null)
      }}
    >
      {/* Close */}
      <button
        type="button"
        onClick={onClose}
        class="absolute top-4 right-4 z-10 w-12 h-12 rounded-full bg-black/50 flex items-center justify-center text-white active:bg-black/70"
      >
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>

      {/* Counter */}
      {attachments.length > 1 && (
        <div class="absolute top-5 left-1/2 -translate-x-1/2 z-10 text-white text-sm font-medium bg-black/40 px-3 py-1 rounded-full">
          {idx + 1} / {attachments.length}
        </div>
      )}

      {/* Media */}
      {isVideo ? (
        <div class="flex-1 flex items-center justify-center p-4">
          <video
            key={att.id}
            src={att.url}
            controls
            playsinline
            class="max-w-full max-h-full rounded-xl"
          />
        </div>
      ) : (
        <ZoomableImage
          key={att.id}
          src={att.url}
          onZoomChange={setZoomed}
          class="flex-1 min-h-0 p-4"
          imgClass="rounded-xl"
        />
      )}

      {/* Prev / Next */}
      {attachments.length > 1 && (
        <>
          <button
            type="button"
            onClick={prev}
            disabled={idx === 0}
            class="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 flex items-center justify-center text-white disabled:opacity-20 active:bg-black/60"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <button
            type="button"
            onClick={next}
            disabled={idx === attachments.length - 1}
            class="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 flex items-center justify-center text-white disabled:opacity-20 active:bg-black/60"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </>
      )}

      {/* Dot indicators */}
      {attachments.length > 1 && attachments.length <= 10 && (
        <div class="flex justify-center gap-1.5 pb-8">
          {attachments.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setIdx(i)}
              class={`w-1.5 h-1.5 rounded-full transition-all ${i === idx ? 'bg-white w-4' : 'bg-white/40'}`}
            />
          ))}
        </div>
      )}
    </div>,
    document.body,
  )
}
