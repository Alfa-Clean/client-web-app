import { useEffect, useState } from 'preact/hooks'
import { Bell } from 'lucide-react'
import { useLocale } from '../i18n'
import { disablePush, enablePush, getPushState, type PushState } from '../api/push'

/**
 * «Уведомления» в профиле — web push для клиента без Telegram. В Mini App,
 * в браузере без Push API и у клиента с Telegram (уведомления идут в бота)
 * блока нет.
 */
export function PushSection() {
  const { t } = useLocale()
  const [state, setState] = useState<PushState>('hidden')
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    getPushState().then(setState).catch(() => setState('hidden'))
  }, [])

  if (state === 'hidden') return null

  async function toggle() {
    if (busy) return
    const turningOn = state !== 'on'
    setBusy(true)
    setFailed(false)
    // Оптимистично: переключатель сдвигается сразу, на ошибке — откат.
    setState(turningOn ? 'on' : 'off')
    try {
      if (turningOn) {
        const granted = await enablePush()
        // Не дал разрешения — либо закрыл запрос (снова 'off'), либо запретил.
        if (!granted) setState(Notification.permission === 'denied' ? 'denied' : 'off')
      } else {
        await disablePush()
      }
    } catch (e) {
      console.error('[push] toggle failed:', e)
      setState(turningOn ? 'off' : 'on')
      setFailed(true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div class="bg-white rounded-2xl border border-gray-100 px-4 py-4">
      <p class="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">{t('push_title')}</p>

      {state === 'install' && <p class="text-sm text-gray-500 leading-relaxed">{t('push_install_hint')}</p>}

      {state === 'insecure' && <p class="text-sm text-gray-500 leading-relaxed">{t('push_dev_insecure')}</p>}

      {state === 'denied' && <p class="text-sm text-gray-500 leading-relaxed">{t('push_denied')}</p>}

      {(state === 'on' || state === 'off') && (
        <button
          type="button"
          role="switch"
          aria-checked={state === 'on'}
          onClick={toggle}
          disabled={busy}
          class="w-full flex items-center gap-3 text-left disabled:opacity-60"
        >
          <span
            class={`w-9 h-9 shrink-0 rounded-xl flex items-center justify-center ${
              state === 'on' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-400'
            }`}
          >
            <Bell size={18} />
          </span>
          <span class="flex-1 min-w-0">
            <span class="block text-sm font-medium text-gray-900">{t('push_toggle')}</span>
            <span class="block text-xs text-gray-500 mt-0.5">{t('push_note')}</span>
          </span>
          <span
            class={`relative w-11 h-6 shrink-0 rounded-full transition-colors ${
              state === 'on' ? 'bg-green-600' : 'bg-gray-200'
            }`}
          >
            <span
              class={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                state === 'on' ? 'translate-x-5' : ''
              }`}
            />
          </span>
        </button>
      )}

      {failed && <p class="text-xs text-red-500 mt-3">{t('push_failed')}</p>}
    </div>
  )
}
