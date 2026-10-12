import { apiFetch, ApiError } from './client'

/**
 * Web push для клиента без Telegram (вошёл по номеру в браузере или PWA).
 * Клиенту с Telegram уведомления идут в бота, push ему не придёт
 * (`telegram_linked`). Контракт — api-handoff-v3 в backend/.claude/docs/ai/web-push.
 *
 * Подписка принадлежит установке браузера, а не аккаунту: при выходе её надо
 * снять с аккаунта (`DELETE`), иначе следующий человек на устройстве получит
 * чужие уведомления.
 */
export interface PushConfig {
  enabled: boolean
  /** VAPID, base64url; `null` при `enabled: false`. */
  public_key: string | null
  /** Уведомления идут в Telegram-бота — push не придёт, даже если подписаться. */
  telegram_linked: boolean
}

export type PushState =
  /** Блока нет: среда без push, Telegram, push выключен или уходит в бота. */
  | 'hidden'
  /** iPhone во вкладке Safari — push только в PWA с экрана «Домой». */
  | 'install'
  /** Только dev: страница по http не с localhost (`mac.local`, IP в сети) —
   *  браузер прячет Push API, и без подсказки блок просто пропадал. */
  | 'insecure'
  | 'denied'
  | 'off'
  | 'on'

const SW_URL = '/sw.js'

const tg = (window as any).Telegram?.WebApp

/** WebView Telegram: Push API там нет. */
function inTelegram(): boolean {
  return !!tg?.initData
}

function hasPushApi(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

function isIos(): boolean {
  // iPadOS выдаёт себя за macOS — отличаем по тачскрину.
  return /iPad|iPhone|iPod/.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

function isStandalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches
    || (navigator as { standalone?: boolean }).standalone === true
}

/** Регистрирует service worker. В Telegram не нужен: push там не работает. */
export function registerServiceWorker() {
  if (inTelegram() || !('serviceWorker' in navigator)) return
  navigator.serviceWorker.register(SW_URL).catch(e => console.error('[push] sw register failed:', e))
}

// Конфиг держим в памяти на сессию. Сбрасывается при ошибке, чтобы следующая
// попытка сходила на сервер заново.
let configPromise: Promise<PushConfig | null> | null = null

/** `null` — у токена нет аккаунта (403): блок скрыть, это не ошибка. */
function getConfig(): Promise<PushConfig | null> {
  configPromise ??= apiFetch<PushConfig>('/push-subscriptions/config').catch(e => {
    if (e instanceof ApiError && e.status === 403) return null
    configPromise = null
    throw e
  })
  return configPromise
}

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
  const raw = atob(padded.replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(raw, c => c.charCodeAt(0))
}

function sameKey(subscription: PushSubscription, publicKey: string): boolean {
  const current = subscription.options.applicationServerKey
  if (!current) return false
  const a = new Uint8Array(current)
  const b = urlBase64ToUint8Array(publicKey)
  return a.length === b.length && a.every((byte, i) => byte === b[i])
}

async function currentSubscription(): Promise<PushSubscription | null> {
  const registration = await navigator.serviceWorker.getRegistration(SW_URL)
  return (await registration?.pushManager.getSubscription()) ?? null
}

function postSubscription(subscription: PushSubscription): Promise<unknown> {
  return apiFetch('/push-subscriptions', {
    method: 'POST',
    body: JSON.stringify(subscription.toJSON()),
  })
}

function deleteSubscription(endpoint: string): Promise<unknown> {
  return apiFetch('/push-subscriptions', {
    method: 'DELETE',
    body: JSON.stringify({ endpoint }),
  })
}

/** Подписка под нужный ключ: старую под другим VAPID-ключом снимаем — push на неё не придёт. */
async function subscribe(publicKey: string): Promise<PushSubscription> {
  const registration = await navigator.serviceWorker.ready
  const existing = await registration.pushManager.getSubscription()
  if (existing && sameKey(existing, publicKey)) return existing
  await existing?.unsubscribe()
  return registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
  })
}

/** Что показать в профиле. Заодно не трогает API, если разрешение запрещено. */
export async function getPushState(): Promise<PushState> {
  if (inTelegram()) return 'hidden'
  if (import.meta.env.DEV && !window.isSecureContext) return 'insecure'
  if (!hasPushApi()) return 'hidden'
  const config = await getConfig()
  if (!config?.enabled || !config.public_key || config.telegram_linked) return 'hidden'
  if (isIos() && !isStandalone()) return 'install'
  if (Notification.permission === 'denied') return 'denied'
  if (Notification.permission !== 'granted') return 'off'
  return (await currentSubscription()) ? 'on' : 'off'
}

// «Не сейчас» в шторке запроса — тоже отказ, больше не спрашиваем. Префикс
// `chaqqon_`: при выходе из аккаунта отметка стирается вместе с остальным.
const PROMPT_DISMISSED_KEY = 'chaqqon_push_prompt_dismissed'
// Клиент выключил push переключателем в профиле. По состоянию браузера это не
// понять: разрешение без подписки бывает и без отказа — Safari переносит
// разрешение сайта в приложение из Dock, подписку может сбросить браузер.
const DISABLED_KEY = 'chaqqon_push_disabled'

function readFlag(key: string): boolean {
  try {
    return localStorage.getItem(key) !== null
  } catch {
    return false
  }
}

function writeFlag(key: string, on: boolean) {
  try {
    if (on) localStorage.setItem(key, '1')
    else localStorage.removeItem(key)
  } catch {
  }
}

/**
 * Предложить уведомления при входе: только пока клиент не решил. Отказ в
 * браузере (`denied`), «Не сейчас» у нас и выключение в профиле — решение,
 * повторно не спрашиваем.
 */
export async function shouldAskForPush(): Promise<boolean> {
  if (readFlag(PROMPT_DISMISSED_KEY) || readFlag(DISABLED_KEY)) return false
  if (!hasPushApi() || Notification.permission === 'denied') return false
  return (await getPushState()) === 'off'
}

export function dismissPushPrompt() {
  writeFlag(PROMPT_DISMISSED_KEY, true)
}

/**
 * Молчаливая сверка после входа. Браузер может тихо сменить подписку, а ключ
 * VAPID — смениться на сервере: тогда push перестаёт приходить без ошибки.
 * Разрешение здесь не запрашивается — только по жесту, в `enablePush`.
 */
export async function syncPushSubscription(): Promise<void> {
  if (inTelegram() || !hasPushApi() || Notification.permission !== 'granted') return
  const existing = await currentSubscription()
  if (!existing) return
  const config = await getConfig()
  if (!config) return

  // Telegram привязали позже: уведомления ушли в бота, подписка больше не нужна.
  if (!config.enabled || !config.public_key || config.telegram_linked) {
    if (config.telegram_linked) {
      await deleteSubscription(existing.endpoint)
      await existing.unsubscribe()
    }
    return
  }

  await postSubscription(await subscribe(config.public_key))
}

/**
 * Включение по нажатию. `false` — клиент не дал разрешения.
 * POST упал — подписка в браузере снимается, чтобы состояние не разъехалось.
 */
export async function enablePush(): Promise<boolean> {
  const config = await getConfig()
  if (!config?.public_key) return false
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return false

  const subscription = await subscribe(config.public_key)
  try {
    await postSubscription(subscription)
  } catch (e) {
    await subscription.unsubscribe().catch(() => {})
    throw e
  }
  writeFlag(DISABLED_KEY, false)
  return true
}

/** Выключение в профиле: снимаем с аккаунта и в браузере. */
export async function disablePush(): Promise<void> {
  const existing = await currentSubscription()
  if (existing) {
    await deleteSubscription(existing.endpoint)
    await existing.unsubscribe()
  }
  writeFlag(DISABLED_KEY, true)
}

/**
 * Перед выходом из аккаунта, пока токен ещё есть. Браузерную подписку не
 * трогаем: следующий вошедший получит её молча, если разрешение уже выдано.
 * Ошибку глотаем — выход из-за сети не блокируем.
 */
export async function detachPushOnLogout(): Promise<void> {
  if (inTelegram() || !hasPushApi()) return
  try {
    const existing = await currentSubscription()
    if (existing) await deleteSubscription(existing.endpoint)
  } catch (e) {
    console.error('[push] detach on logout failed:', e)
  }
}
