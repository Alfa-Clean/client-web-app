import { useRef, useState } from 'preact/hooks'
import { createPortal } from 'preact/compat'
import { Star, CheckCircle2, Plus } from 'lucide-react'
import { useLocale } from '../i18n'

interface Props {
  /** Заголовок шита — по умолчанию клининговый `rating_title`. */
  title?: string
  /** Сохраняет отзыв. Должен сам глотать ошибки — UI всегда показывает благодарность. */
  onSubmit: (score: number, comment: string, files: File[]) => Promise<void>
  /** Закрыть шит — вызывается после благодарности или при пропуске. */
  onClose: () => void
}

type Phase = 'rate' | 'sending' | 'thanks'

const MAX_ATTACH_SIZE = 20 * 1024 * 1024
const MAX_ATTACH_COUNT = 5

export function RatingSheet({ title, onSubmit, onClose }: Props) {
  const { t } = useLocale()
  const [score, setScore] = useState(0)
  const [hovered, setHovered] = useState(0)
  const [comment, setComment] = useState('')
  const [phase, setPhase] = useState<Phase>('rate')
  const [attachments, setAttachments] = useState<File[]>([])
  const [previewUrls, setPreviewUrls] = useState<string[]>([])
  const [mediaError, setMediaError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleFilesSelected(e: Event) {
    const input = e.target as HTMLInputElement
    const files = Array.from(input.files ?? [])
    input.value = ''
    setMediaError(null)
    const remaining = MAX_ATTACH_COUNT - attachments.length
    if (remaining <= 0) return
    const valid: File[] = []
    for (const f of files.slice(0, remaining)) {
      if (f.size > MAX_ATTACH_SIZE) { setMediaError(t('order_media_size_error')); continue }
      if (!f.type.startsWith('image/') && !f.type.startsWith('video/')) { setMediaError(t('order_media_type_error')); continue }
      valid.push(f)
    }
    if (valid.length === 0) return
    setAttachments(prev => [...prev, ...valid])
    setPreviewUrls(prev => [...prev, ...valid.map(f => URL.createObjectURL(f))])
  }

  function removeAttachment(idx: number) {
    URL.revokeObjectURL(previewUrls[idx])
    setAttachments(prev => prev.filter((_, i) => i !== idx))
    setPreviewUrls(prev => prev.filter((_, i) => i !== idx))
    setMediaError(null)
  }

  async function handleSubmit() {
    if (score === 0 || phase !== 'rate') return
    setPhase('sending')
    await onSubmit(score, comment.trim(), attachments)
    setPhase('thanks')
    setTimeout(onClose, 1400)
  }

  return createPortal(
    <div class="fixed inset-0 z-50 flex items-end">
      <div class="absolute inset-0 bg-black/40 animate-fade-in" />
      <div class="relative w-full bg-white rounded-t-3xl px-6 pt-6 pb-10 flex flex-col gap-5 animate-slide-up">
        <div class="w-10 h-1 bg-gray-200 rounded-full mx-auto" />

        {phase === 'thanks' ? (
          <div class="flex flex-col items-center gap-3 py-6 animate-scale-in">
            <CheckCircle2 size={48} class="text-green-800" />
            <p class="text-lg font-semibold text-gray-900">{t('rating_thanks')}</p>
          </div>
        ) : (
          <>
            <div class="text-center">
              <p class="text-lg font-semibold text-gray-900">{title ?? t('rating_title')}</p>
              <p class="text-sm text-gray-400 mt-1">{t('rating_subtitle')}</p>
            </div>
            <div class="flex justify-center gap-3">
              {[1, 2, 3, 4, 5].map(n => {
                const active = n <= (hovered || score)
                const justSelected = n === score
                return (
                  <button
                    key={justSelected ? `sel-${n}` : n}
                    type="button"
                    onClick={() => setScore(n)}
                    onMouseEnter={() => setHovered(n)}
                    onMouseLeave={() => setHovered(0)}
                    class={`transition-transform active:scale-90 ${justSelected ? 'animate-star-pop' : ''}`}
                  >
                    <Star
                      size={36}
                      fill={active ? '#f59e0b' : 'none'}
                      class={active ? 'text-[#f59e0b]' : 'text-[#d1d5db]'}
                    />
                  </button>
                )
              })}
            </div>
            <textarea
              class="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 resize-none outline-none focus:border-blue-400 transition-colors bg-gray-50"
              rows={3}
              placeholder={t('rating_comment_placeholder')}
              value={comment}
              onInput={e => setComment((e.target as HTMLTextAreaElement).value)}
            />

            <div class="flex flex-col gap-2">
              <div class="flex items-center gap-2 overflow-x-auto">
                {previewUrls.map((url, idx) => {
                  const isVideo = attachments[idx]?.type.startsWith('video/')
                  return (
                    <div key={url} class="relative shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-gray-100">
                      {isVideo ? (
                        <video src={url} muted preload="metadata" class="w-full h-full object-cover" />
                      ) : (
                        <img src={url} alt="" class="w-full h-full object-cover" />
                      )}
                      <button
                        type="button"
                        onClick={() => removeAttachment(idx)}
                        class="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/60 flex items-center justify-center"
                      >
                        <svg width="6" height="6" viewBox="0 0 8 8" fill="none">
                          <path d="M1 1l6 6M7 1L1 7" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
                        </svg>
                      </button>
                      {isVideo && (
                        <div class="absolute bottom-0.5 left-0.5 w-4 h-4 rounded-full bg-black/50 flex items-center justify-center">
                          <svg width="6" height="7" viewBox="0 0 8 9" fill="none">
                            <path d="M1.5 1.5l5 3-5 3V1.5z" fill="white"/>
                          </svg>
                        </div>
                      )}
                    </div>
                  )
                })}
                {attachments.length < MAX_ATTACH_COUNT && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    class="shrink-0 w-16 h-16 rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-400 active:bg-gray-50 transition-colors"
                  >
                    <Plus size={18} />
                  </button>
                )}
              </div>
              {mediaError && <p class="text-xs text-red-500">{mediaError}</p>}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                multiple
                class="hidden"
                onChange={handleFilesSelected}
              />
            </div>

            <button
              type="button"
              disabled={score === 0 || phase === 'sending'}
              onClick={handleSubmit}
              class="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-semibold py-3.5 rounded-xl transition-all active:scale-95 text-sm"
            >
              {t('rating_submit')}
            </button>
            <button
              type="button"
              disabled={phase === 'sending'}
              onClick={onClose}
              class="text-sm text-gray-400 hover:text-gray-600 active:scale-95 transition-all text-center -mt-2 disabled:opacity-50"
            >
              {t('rating_skip')}
            </button>
          </>
        )}
      </div>
    </div>,
    document.body,
  )
}
