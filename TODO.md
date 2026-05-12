# TODO — Client Web App

## Срочно: закоммитить накопленное

Незакоммиченные изменения с прошлых сессий:

- `src/components/CalendarPicker.tsx` — новый компонент
- `src/components/ConfirmDialog.tsx` — новый компонент
- `src/hooks/useConfirm.ts` — хук
- `src/hooks/useExitBack.ts` — хук
- `src/screens/OrderScreen.tsx` — чипы Сегодня/Завтра/Другой день + CalendarPicker, фиксированные слоты
- `src/screens/ExecutorScreen.tsx` — анимация slide-in
- `src/api/orders.ts` — `acceptOrder`, `rateOrder`, `OrderRating`
- `src/api/client.ts` — `clearToken`
- `src/hooks/useUser.ts` — валидация telegram_id
- `vite.config.ts` — порт 3000, allowedHosts, `/clients` прокси

## Чат — доработки (реализует другой бот)

Промпт передан. Задачи:

- [ ] Пагинация при скролле вверх (offset += 50, не сбрасывать список)
- [ ] Оптимистичный UI — сразу показывать сообщение, заменять ответом сервера; при ошибке — красным с кнопкой "Повторить"
- [ ] Обработка `403` при отправке — показать уведомление "Чат закрыт" и перевести в readonly
- [ ] Авторасширение textarea по контенту (до max-h-32)

## Чат — медиа

- [ ] Загрузка изображений: `POST /orders/{id}/messages/media` (multipart/form-data)
  - Поля: `file` (max 5MB, image/jpeg|png|webp), `sender_type`, `sender_id`
  - Кнопка скрепки рядом с полем ввода
  - Превью перед отправкой

## Обновление статуса заказа в реальном времени

Сейчас `OrdersTab` загружает заказ один раз при маунте — статус не обновляется.

Варианты (выбрать один):
- [ ] **Polling** — перезапрашивать `GET /orders?telegram_id=...` каждые 10–15 сек пока заказ активный (проще всего)
- [ ] **SSE / WebSocket** — если бэкенд добавит endpoint (сложнее, зависит от бэкенда)

## Тестирование на устройстве

- [ ] Настроить ngrok/tunnel для HTTPS (Telegram Mini App требует HTTPS)
- [ ] Протестировать полный флоу на реальном телефоне через Telegram
