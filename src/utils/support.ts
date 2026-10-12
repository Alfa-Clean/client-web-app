/** Аккаунт поддержки в Telegram. Вшит в клиент: ведёт туда, где бэкенд не помог. */
export const SUPPORT_TELEGRAM_URL = 'https://t.me/chaqqon_support'

/**
 * В Mini App ссылку на t.me открывает сам Telegram — так чат открывается
 * внутри клиента, а не во внешнем браузере. Вне Telegram — новая вкладка.
 */
export function openSupportChat() {
  const webApp = (window as any).Telegram?.WebApp
  if (webApp?.initData && typeof webApp.openTelegramLink === 'function') {
    webApp.openTelegramLink(SUPPORT_TELEGRAM_URL)
    return
  }
  window.open(SUPPORT_TELEGRAM_URL, '_blank', 'noopener,noreferrer')
}
