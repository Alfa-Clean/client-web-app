import { useRef, useState } from 'preact/hooks'
import { createPortal } from 'preact/compat'
import { X, Plus } from 'lucide-react'
import { useLocale } from '../i18n'

interface Props {
  /** Открывает спор с указанной причиной и (опционально) медиа. Должен бросать при ошибке — сообщение об ошибке показывает сам шит. */
  onSubmit: (reason: string, files: File[]) => Promise<void>
  onClose: () => void
}

const MAX_REASON_LENGTH = 1000
const MAX_ATTACH_SIZE = 20 * 1024 * 1024
const MAX_ATTACH_COUNT = 5

export function DisputeSheet({ onSubmit, onClose }: Props) {
  const { t } = useLocale()
  const [reason, setReason] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
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
    const trimmed = reason.trim()
    if (!trimmed || sending) return
    setSending(true)
    setError(null)
    try {
      await onSubmit(trimmed, attachments)
    } catch {
      setError(t('dispute_submit_error'))
      setSending(false)
    }
  }

  return createPortal(
    <div class="fixed inset-0 z-50 flex items-end">
      <div class="absolute inset-0 bg-black/40 animate-fade-in" onClick={() => !sending && onClose()} />
      <div class="relative w-full bg-white rounded-t-3xl px-6 pt-6 pb-10 flex flex-col gap-4 animate-slide-up">
        <div class="w-10 h-1 bg-gray-200 rounded-full mx-auto" />

        <div class="flex items-center justify-between">
          <p class="text-lg font-semibold text-gray-900">{t('confirm_dispute_order_title')}</p>
          <button
            type="button"
            onClick={onClose}
            disabled={sending}
            class="text-gray-400 p-1 disabled:opacity-40"
          >
            <X size={20} />
          </button>
        </div>

        <p class="text-sm text-gray-500 leading-relaxed">{t('confirm_dispute_order')}</p>

        <textarea
          class="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 resize-none outline-none focus:border-red-400 transition-colors bg-gray-50"
          rows={4}
          maxLength={MAX_REASON_LENGTH}
          placeholder={t('dispute_reason_placeholder')}
          value={reason}
          onInput={e => setReason((e.target as HTMLTextAreaElement).value)}
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
                    disabled={sending}
                    class="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/60 flex items-center justify-center disabled:opacity-40"
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
                disabled={sending}
                class="shrink-0 w-16 h-16 rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-400 active:bg-gray-50 transition-colors disabled:opacity-40"
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

        {error && <p class="text-xs text-red-500">{error}</p>}

        <button
          type="button"
          disabled={!reason.trim() || sending}
          onClick={handleSubmit}
          class="w-full bg-red-500 hover:bg-red-600 disabled:bg-gray-200 disabled:text-gray-400 text-white font-semibold py-3.5 rounded-xl transition-all active:scale-95 text-sm"
        >
          {sending ? t('btn_loading') : t('dispute_submit')}
        </button>
      </div>
    </div>,
    document.body,
  )
}
