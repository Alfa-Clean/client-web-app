import { useEffect, useState } from 'preact/hooks'
import { Bell } from 'lucide-react'
import { useLocale } from '../i18n'
import { BottomSheet } from './BottomSheet'
import { dismissPushPrompt, enablePush, shouldAskForPush } from '../api/push'

interface Props {
  /** Шторку не показываем поверх онбординга и чужих экранов. */
  ready: boolean
}

/**
 * Предложение включить уведомления при входе — клиенту, который ещё не решил.
 * Системный запрос разрешения браузер даёт только по жесту, поэтому сначала
 * своя шторка, и `requestPermission` — по кнопке «Включить».
 */
export function PushPrompt({ ready }: Props) {
  const { t } = useLocale()
  const [ask, setAsk] = useState(false)
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    shouldAskForPush().then(setAsk).catch(() => setAsk(false))
  }, [])

  useEffect(() => {
    if (ask && ready) setOpen(true)
  }, [ask, ready])

  function close() {
    setOpen(false)
    setAsk(false)
  }

  function later() {
    dismissPushPrompt()
    close()
  }

  async function enable() {
    if (busy) return
    setBusy(true)
    setFailed(false)
    try {
      await enablePush()
      // Разрешение выдано или запрещено в системном окне — решение принято,
      // шторка больше не нужна. Закрыл системное окно без ответа — браузер
      // спросит снова, а мы — нет.
      dismissPushPrompt()
      close()
    } catch (e) {
      console.error('[push] enable from prompt failed:', e)
      setFailed(true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <BottomSheet open={open} onClose={later}>
      <div class="px-5 pt-3 pb-6 flex flex-col items-center text-center">
        <span class="w-14 h-14 rounded-2xl bg-green-100 text-green-800 flex items-center justify-center mb-4">
          <Bell size={26} />
        </span>
        <p class="text-lg font-bold text-gray-900">{t('push_prompt_title')}</p>
        <p class="text-sm text-gray-500 mt-2 leading-relaxed">{t('push_prompt_text')}</p>
        {failed && <p class="text-xs text-red-500 mt-3">{t('push_failed')}</p>}
        <button
          type="button"
          onClick={enable}
          disabled={busy}
          class="w-full mt-6 bg-green-700 hover:bg-green-800 disabled:opacity-50 text-white font-semibold py-4 rounded-2xl transition-all active:scale-95 text-sm"
        >
          {t('push_prompt_enable')}
        </button>
        <button
          type="button"
          onClick={later}
          disabled={busy}
          class="w-full mt-2 text-gray-500 font-medium py-3 rounded-2xl active:bg-gray-50 transition-colors text-sm"
        >
          {t('push_prompt_later')}
        </button>
      </div>
    </BottomSheet>
  )
}
