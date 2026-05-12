import { useEffect, useRef, useState } from 'preact/hooks'
import type { ChatMessage } from '../api/chat'
import { getMessages, sendMessage } from '../api/chat'
import { useLocale } from '../i18n'
import { useExitBack } from '../hooks/useExitBack'

interface Props {
  orderId: string
  executorName: string
  senderId: string
  readonly?: boolean
  onBack: () => void
}

const LOCALE_MAP: Record<string, string> = { ru: 'ru-RU', uz: 'uz-UZ', en: 'en-US' }

export function ChatScreen({ orderId, executorName, senderId, readonly = false, onBack }: Props) {
  const { t, lang } = useLocale()
  const { exiting, handleBack } = useExitBack(onBack)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  async function load() {
    try {
      const res = await getMessages(orderId)
      setMessages(res.items)
      setError(null)
    } catch {
      setError(t('chat_load_error'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    if (!readonly) {
      pollRef.current = setInterval(load, 5000)
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [orderId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  async function handleSend() {
    const trimmed = text.trim()
    if (!trimmed || sending) return
    setSending(true)
    setText('')
    try {
      const msg = await sendMessage(orderId, trimmed, senderId)
      setMessages(prev => [...prev, msg])
    } catch {
      setText(trimmed)
      setError(t('chat_send_error'))
    } finally {
      setSending(false)
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
    const now = new Date()
    const locale = LOCALE_MAP[lang] ?? 'ru-RU'
    const sameDay = d.toDateString() === now.toDateString()
    if (sameDay) {
      return d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
    }
    return d.toLocaleString(locale, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  }

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
        <div class="flex-1 min-w-0">
          <p class="text-base font-semibold text-gray-900 truncate">{executorName}</p>
          <p class="text-xs text-gray-400">
            {readonly ? t('chat_readonly_hint') : t('chat_active_hint')}
          </p>
        </div>
        <span class="text-2xl leading-none">🧹</span>
      </div>

      {/* Messages */}
      <div class="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-2">
        {loading && (
          <div class="flex-1 flex items-center justify-center">
            <p class="text-sm text-gray-400">{t('btn_loading')}</p>
          </div>
        )}

        {!loading && messages.length === 0 && (
          <div class="flex-1 flex flex-col items-center justify-center gap-2 text-center py-16">
            <p class="text-4xl leading-none">💬</p>
            <p class="text-sm text-gray-400 mt-2">{t('chat_empty')}</p>
          </div>
        )}

        {messages.map((msg, i) => {
          const isClient = msg.sender_type === 'client'
          const prevMsg = messages[i - 1]
          const showDate = !prevMsg || new Date(msg.created_at).toDateString() !== new Date(prevMsg.created_at).toDateString()

          return (
            <div key={msg.id}>
              {showDate && (
                <div class="flex justify-center my-2">
                  <span class="text-[11px] text-gray-400 bg-gray-100 px-3 py-1 rounded-full">
                    {new Date(msg.created_at).toLocaleDateString(LOCALE_MAP[lang] ?? 'ru-RU', { day: 'numeric', month: 'long' })}
                  </span>
                </div>
              )}
              <div class={`flex ${isClient ? 'justify-end' : 'justify-start'}`}>
                <div
                  class={`max-w-[75%] px-4 py-2.5 rounded-2xl ${
                    isClient
                      ? 'bg-blue-600 text-white rounded-br-sm'
                      : 'bg-white border border-gray-100 text-gray-800 rounded-bl-sm'
                  }`}
                >
                  {msg.media_url && (
                    <img
                      src={msg.media_url}
                      alt=""
                      class="rounded-xl max-w-full mb-1"
                      loading="lazy"
                    />
                  )}
                  {msg.content && (
                    <p class="text-sm leading-relaxed break-words whitespace-pre-wrap">{msg.content}</p>
                  )}
                  <p class={`text-[10px] mt-1 text-right ${isClient ? 'text-blue-200' : 'text-gray-400'}`}>
                    {formatTime(msg.created_at)}
                  </p>
                </div>
              </div>
            </div>
          )
        })}

        {error && (
          <p class="text-xs text-red-500 text-center py-2">{error}</p>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      {!readonly && (
        <div class="bg-white border-t border-gray-100 px-4 py-3 flex items-end gap-3 shrink-0">
          <textarea
            class="flex-1 border border-gray-200 rounded-2xl px-4 py-2.5 text-sm text-gray-800 resize-none outline-none focus:border-blue-400 transition-colors bg-gray-50 max-h-32"
            rows={1}
            placeholder={t('chat_input_placeholder')}
            value={text}
            onInput={e => setText((e.target as HTMLTextAreaElement).value)}
            onKeyDown={handleKeyDown}
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!text.trim() || sending}
            class="w-10 h-10 shrink-0 flex items-center justify-center bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 text-white rounded-2xl transition-all active:scale-90"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
      )}

      {readonly && (
        <div class="bg-gray-100 px-4 py-3 text-center shrink-0">
          <p class="text-xs text-gray-400">{t('chat_readonly_hint')}</p>
        </div>
      )}
    </div>
  )
}
