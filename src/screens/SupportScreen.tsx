import { useState } from 'preact/hooks'
import { MessageCircle, ChevronRight } from 'lucide-react'
import { useLocale } from '../i18n'

interface Props {
  onBack: () => void
  onOpenChat: () => void
}

const FAQ_KEYS = ['1', '2', '3', '4', '5', '6']

export function SupportScreen({ onBack, onOpenChat }: Props) {
  const { t } = useLocale()
  const [openId, setOpenId] = useState<string | null>(null)

  return (
    <div class="min-h-screen bg-gray-50 flex flex-col">
      <div class="bg-white px-4 py-5 border-b border-gray-100 relative flex items-center justify-center">
        <button
          type="button"
          onClick={onBack}
          class="absolute left-4 w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 text-lg font-light active:bg-gray-200 transition-colors"
        >
          ‹
        </button>
        <h1 class="text-base font-bold text-gray-900">{t('support_title')}</h1>
      </div>

      <div class="flex-1 overflow-y-auto px-4 py-5 flex flex-col gap-4">
        <p class="text-[10px] font-semibold uppercase tracking-widest text-gray-400">{t('support_faq_label')}</p>

        <div class="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50 overflow-hidden">
          {FAQ_KEYS.map(id => {
            const open = openId === id
            return (
              <div key={id}>
                <button
                  type="button"
                  onClick={() => setOpenId(open ? null : id)}
                  class="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left active:bg-gray-50 transition-colors"
                >
                  <span class="text-sm font-medium text-gray-900">{t(`support_faq_q${id}`)}</span>
                  <svg
                    width="16" height="16" viewBox="0 0 16 16" fill="none"
                    class={`shrink-0 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
                  >
                    <path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </button>
                <div class={`grid transition-all duration-300 ease-in-out ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                  <div class="overflow-hidden">
                    <p class="px-4 pb-3.5 text-sm text-gray-500 leading-relaxed">{t(`support_faq_a${id}`)}</p>
                  </div>
                </div>
              </div>
            )
          })}

          <button
            type="button"
            onClick={onOpenChat}
            class="w-full flex items-center gap-3 px-4 py-3.5 text-left active:bg-gray-50 transition-colors"
          >
            <div class="w-8 h-8 rounded-xl bg-[#F0F9EE] flex items-center justify-center shrink-0">
              <MessageCircle size={16} class="text-[#44973A]" />
            </div>
            <span class="flex-1 text-sm font-medium text-gray-900">{t('support_open_chat')}</span>
            <ChevronRight size={16} class="text-gray-300 shrink-0" />
          </button>
        </div>
      </div>
    </div>
  )
}
