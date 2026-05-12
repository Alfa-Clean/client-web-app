import { useEffect, useRef, useState } from 'preact/hooks'
import type { ChatMessage } from '../api/chat'
import { getMessages, sendMediaMessage, sendMessage } from '../api/chat'
import { getExecutor } from '../api/executors'
import { useLocale } from '../i18n'
import { useExitBack } from '../hooks/useExitBack'

interface Props {
  orderId: string
  executorId: string | null
  executorName: string
  senderId: string
  readonly?: boolean
  onBack: () => void
}

const LOCALE_MAP: Record<string, string> = { ru: 'ru-RU', uz: 'uz-UZ', en: 'en-US' }
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_FILE_SIZE = 5 * 1024 * 1024

export function ChatScreen({ orderId, executorId, executorName, senderId, readonly = false, onBack }: Props) {
  const { t, lang } = useLocale()
  const { exiting, handleBack } = useExitBack(onBack)

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [text, setText] = useState('')
  const [mediaFile, setMediaFile] = useState<File | null>(null)
  const [mediaPreviewUrl, setMediaPreviewUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [isReadonly, setIsReadonly] = useState(readonly)

  const bottomRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const serverTotalRef = useRef(0)
  const startOffsetRef = useRef(0)
  const firstLoad = useRef(true)

  async function loadInitial() {
    try {
      // probe total first to start from newest 50
      const probe = await getMessages(orderId, 1, 0)
      const total = probe.total
      const startOffset = Math.max(0, total - 50)
      const res = startOffset === 0 ? probe.items.length <= 1
        ? await getMessages(orderId, 50, 0)
        : probe
        : await getMessages(orderId, 50, startOffset)
      setMessages(res.items)
      serverTotalRef.current = total
      startOffsetRef.current = startOffset
      setHasMore(startOffset > 0)
      setError(null)
    } catch {
      setError(t('chat_load_error'))
    } finally {
      setLoading(false)
    }
  }

  async function pollNew() {
    try {
      const res = await getMessages(orderId, 50, serverTotalRef.current)
      if (res.items.length > 0) {
        setMessages(prev => [...prev, ...res.items])
        serverTotalRef.current = res.total
      }
    } catch {
      // silent
    }
  }

  async function loadOlder() {
    if (loadingMore || startOffsetRef.current === 0) return
    setLoadingMore(true)
    try {
      const newOffset = Math.max(0, startOffsetRef.current - 50)
      const limit = startOffsetRef.current - newOffset
      const res = await getMessages(orderId, limit, newOffset)
      const prevScrollHeight = listRef.current?.scrollHeight ?? 0
      setMessages(prev => [...res.items, ...prev])
      startOffsetRef.current = newOffset
      setHasMore(newOffset > 0)
      // restore scroll position after prepend
      requestAnimationFrame(() => {
        if (listRef.current) {
          listRef.current.scrollTop = listRef.current.scrollHeight - prevScrollHeight
        }
      })
    } catch {
      // silent
    } finally {
      setLoadingMore(false)
    }
  }

  useEffect(() => {
    loadInitial()
    if (executorId) {
      getExecutor(executorId).then(e => setAvatarUrl(e.avatar_url)).catch(() => {})
    }
    if (!readonly) {
      pollRef.current = setInterval(pollNew, 4000)
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [orderId])

  useEffect(() => {
    if (!loading) {
      if (firstLoad.current) {
        firstLoad.current = false
        bottomRef.current?.scrollIntoView()
      } else {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
      }
    }
  }, [messages.length, loading])

  useEffect(() => {
    return () => {
      if (mediaPreviewUrl) URL.revokeObjectURL(mediaPreviewUrl)
    }
  }, [mediaPreviewUrl])

  function handleTextInput(e: Event) {
    const ta = e.target as HTMLTextAreaElement
    ta.style.height = 'auto'
    ta.style.height = `${ta.scrollHeight}px`
    setText(ta.value)
  }

  function handleFileSelect(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (!file) return
    if (file.size > MAX_FILE_SIZE) { setError(t('chat_media_too_large')); return }
    if (!ALLOWED_TYPES.includes(file.type)) { setError(t('chat_media_wrong_type')); return }
    if (mediaPreviewUrl) URL.revokeObjectURL(mediaPreviewUrl)
    setMediaFile(file)
    setMediaPreviewUrl(URL.createObjectURL(file))
    setError(null)
  }

  function clearMedia() {
    if (mediaPreviewUrl) URL.revokeObjectURL(mediaPreviewUrl)
    setMediaFile(null)
    setMediaPreviewUrl(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleSend() {
    if (sending || uploading) return
    if (mediaFile) {
      setUploading(true)
      try {
        const msg = await sendMediaMessage(orderId, mediaFile, senderId)
        setMessages(prev => [...prev, msg])
        serverTotalRef.current += 1
        clearMedia()
      } catch (err: unknown) {
        handleSendError(err)
      } finally {
        setUploading(false)
      }
      return
    }
    const trimmed = text.trim()
    if (!trimmed) return
    setSending(true)
    setText('')
    if (textareaRef.current) { textareaRef.current.style.height = 'auto' }
    try {
      const msg = await sendMessage(orderId, trimmed, senderId)
      setMessages(prev => [...prev, msg])
      serverTotalRef.current += 1
    } catch (err: unknown) {
      setText(trimmed)
      handleSendError(err)
    } finally {
      setSending(false)
    }
  }

  function handleSendError(err: unknown) {
    const status = (err as { status?: number })?.status
    if (status === 403) {
      setIsReadonly(true)
      if (pollRef.current) clearInterval(pollRef.current)
      setError(t('chat_closed_error'))
    } else {
      setError(t('chat_send_error'))
    }
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  function formatTime(isoStr: string): string {
    const d = new Date(isoStr)
    const locale = LOCALE_MAP[lang] ?? 'ru-RU'
    if (d.toDateString() === new Date().toDateString()) {
      return d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
    }
    return d.toLocaleString(locale, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  }

  function getInitials(name: string) {
    return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  }

  const canSend = !isReadonly && !sending && !uploading && (!!text.trim() || !!mediaFile)

  return (
    <div class={`h-screen bg-gray-50 flex flex-col ${exiting ? 'animate-slide-out-right' : 'animate-slide-in-right'}`}>
      {/* Header */}
      <div class="bg-white border-b border-gray-100 px-4 pt-4 pb-3 flex items-center gap-3 shrink-0">
        <button
          type="button"
          onClick={handleBack}
          class="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 active:bg-gray-200 transition-colors text-gray-700 text-xl"
        >
          ‹
        </button>
        <div class="w-9 h-9 rounded-full bg-blue-100 shrink-0 overflow-hidden flex items-center justify-center">
          {avatarUrl
            ? <img src={avatarUrl} alt="" class="w-full h-full object-cover" />
            : <span class="text-xs font-semibold text-blue-600">{getInitials(executorName)}</span>
          }
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-base font-semibold text-gray-900 truncate">{executorName}</p>
          <p class="text-xs text-gray-400">
            {isReadonly ? t('chat_readonly_hint') : t('chat_active_hint')}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div ref={listRef} class="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-2">
        {loading && (
          <div class="flex-1 flex items-center justify-center">
            <p class="text-sm text-gray-400">{t('btn_loading')}</p>
          </div>
        )}

        {!loading && hasMore && (
          <div class="flex justify-center py-2">
            <button
              type="button"
              onClick={loadOlder}
              disabled={loadingMore}
              class="text-xs text-blue-600 font-medium bg-blue-50 px-4 py-1.5 rounded-full active:bg-blue-100 transition-colors disabled:text-gray-400 disabled:bg-gray-100"
            >
              {loadingMore ? t('chat_loading_more') : t('chat_load_more')}
            </button>
          </div>
        )}

        {!loading && messages.length === 0 && (
          <div class="flex-1 flex flex-col items-center justify-center gap-2 text-center py-16">
            <p class="text-4xl leading-none">💬</p>
            <p class="text-sm text-gray-400 mt-2">{t('chat_empty')}</p>
          </div>
        )}

        {messages.map((msg, i) => {
          const prevMsg = messages[i - 1]
          const showDate = !prevMsg || new Date(msg.created_at).toDateString() !== new Date(prevMsg.created_at).toDateString()
          const isClient = msg.sender_type === 'client'
          const isSystem = msg.sender_type === 'system'

          return (
            <div key={msg.id}>
              {showDate && (
                <div class="flex justify-center my-2">
                  <span class="text-[11px] text-gray-400 bg-gray-100 px-3 py-1 rounded-full">
                    {new Date(msg.created_at).toLocaleDateString(LOCALE_MAP[lang] ?? 'ru-RU', { day: 'numeric', month: 'long' })}
                  </span>
                </div>
              )}

              {isSystem ? (
                <div class="flex justify-center my-1">
                  <span class="text-[11px] text-gray-500 bg-gray-100 px-3 py-1.5 rounded-full text-center max-w-[80%]">
                    {msg.content}
                  </span>
                </div>
              ) : (
                <div class={`flex items-end gap-2 ${isClient ? 'justify-end' : 'justify-start'}`}>
                  {!isClient && (
                    <div class="w-7 h-7 rounded-full bg-blue-100 shrink-0 overflow-hidden flex items-center justify-center mb-0.5">
                      {avatarUrl
                        ? <img src={avatarUrl} alt="" class="w-full h-full object-cover" />
                        : <span class="text-[10px] font-semibold text-blue-600">{getInitials(executorName)}</span>
                      }
                    </div>
                  )}
                  <div class={`max-w-[72%] px-4 py-2.5 rounded-2xl ${isClient ? 'bg-blue-600 text-white rounded-br-sm' : 'bg-white border border-gray-100 text-gray-800 rounded-bl-sm'}`}>
                    {msg.media_url && (
                      <img src={msg.media_url} alt="" class="rounded-xl max-w-full mb-1" loading="lazy" />
                    )}
                    {msg.content && (
                      <p class="text-sm leading-relaxed break-words whitespace-pre-wrap">{msg.content}</p>
                    )}
                    <p class={`text-[10px] mt-1 text-right ${isClient ? 'text-blue-200' : 'text-gray-400'}`}>
                      {formatTime(msg.created_at)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )
        })}

        {error && <p class="text-xs text-red-500 text-center py-2">{error}</p>}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      {!isReadonly && (
        <div class="bg-white border-t border-gray-100 px-4 py-3 flex flex-col gap-2 shrink-0">
          {/* Media preview */}
          {mediaPreviewUrl && (
            <div class="relative w-20 h-20">
              <img src={mediaPreviewUrl} alt="" class="w-full h-full object-cover rounded-xl" />
              <button
                type="button"
                onClick={clearMedia}
                class="absolute -top-1.5 -right-1.5 w-5 h-5 bg-gray-800 text-white rounded-full text-xs flex items-center justify-center leading-none"
              >
                ×
              </button>
              {uploading && (
                <div class="absolute inset-0 bg-white/60 rounded-xl flex items-center justify-center">
                  <div class="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
          )}

          <div class="flex items-end gap-2">
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              class="hidden"
              onChange={handleFileSelect}
            />
            {/* Attach button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              class="w-10 h-10 shrink-0 flex items-center justify-center text-gray-400 hover:text-blue-500 transition-colors active:scale-90"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
              </svg>
            </button>

            <textarea
              ref={textareaRef}
              class="flex-1 border border-gray-200 rounded-2xl px-4 py-2.5 text-sm text-gray-800 resize-none outline-none focus:border-blue-400 transition-colors bg-gray-50 overflow-y-auto"
              style="max-height:8rem"
              rows={1}
              placeholder={t('chat_input_placeholder')}
              value={text}
              onInput={handleTextInput}
              onKeyDown={handleKeyDown}
            />

            <button
              type="button"
              onClick={handleSend}
              disabled={!canSend}
              class="w-10 h-10 shrink-0 flex items-center justify-center bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 text-white rounded-2xl transition-all active:scale-90"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {isReadonly && (
        <div class="bg-gray-100 px-4 py-3 text-center shrink-0">
          <p class="text-xs text-gray-400">{t('chat_readonly_hint')}</p>
        </div>
      )}
    </div>
  )
}
