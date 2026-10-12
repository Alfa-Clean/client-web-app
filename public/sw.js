// Service worker клиентского приложения — только web push, ничего не кеширует.
// Отдаётся с Cache-Control: no-cache (public/_headers), иначе обновление
// застрянет в кеше браузера.

self.addEventListener('install', () => self.skipWaiting())

// Без claim уже открытая вкладка не под контролем SW, и WindowClient.navigate
// по клику на уведомление падает.
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))

// Уведомление показываем на каждый push (userVisibleOnly): иначе браузер
// отзовёт подписку. Тексты приходят готовые, на языке аккаунта.
self.addEventListener('push', (event) => {
  let p
  try {
    p = event.data?.json()
  } catch {
    p = null
  }
  p ??= { title: 'Chaqqon', body: '', url: '/' }
  event.waitUntil(self.registration.showNotification(p.title, {
    body: p.body,
    // Тот же tag («order:<id>») заменяет прежнее уведомление в шторке.
    tag: p.tag,
    renotify: Boolean(p.tag),
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: { url: p.url },
  }))
})

// Клик: открытое окно приложения фокусируем и ведём на url (`/?open=...`),
// второе не открываем.
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = new URL(event.notification.data?.url ?? '/', self.location.origin).href
  event.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    const win = wins.find((w) => new URL(w.url).origin === self.location.origin)
    if (win) {
      await win.focus()
      try {
        return await win.navigate(url)
      } catch {
        // Окно не под контролем SW — navigate недоступен.
      }
    }
    return self.clients.openWindow(url)
  })())
})
