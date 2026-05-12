# AlfaClean — Client Web App

Telegram Mini App для заказа клининга. Открывается внутри Telegram, авторизуется через `initData`, общается с FastAPI-бэкендом.

## Стек

| | |
|---|---|
| UI | Preact 10 + TypeScript |
| Стили | Tailwind CSS v4 |
| Карты | Leaflet |
| Telegram SDK | @twa-dev/sdk |
| Сборка | Vite 8 |
| Деплой | Cloudflare Pages |

## Быстрый старт

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # сборка в dist/
npm run preview    # предпросмотр сборки
```

## Переменные окружения

Создать `.env.local` (уже есть в репо):

| Переменная | Назначение |
|---|---|
| `VITE_API_URL` | Базовый URL API для продакшена (пусто = относительные пути) |
| `API_URL` | Цель proxy в dev-режиме (по умолчанию `http://localhost:8000`) |
| `SERVICE_KEY` | Заголовок `X-Service-Key` для dev-proxy |

В dev-режиме Vite проксирует `/users`, `/orders`, `/addresses`, `/addons`, `/executors`, `/clients`, `/auth`, `/geocode` → `API_URL`.

## Структура

```
src/
├── api/           # HTTP-клиенты (apiFetch, токен, каждый ресурс)
├── components/    # Переиспользуемые компоненты
│   ├── BottomBar.tsx
│   ├── CalendarPicker.tsx
│   ├── ConfirmDialog.tsx
│   └── MapPicker.tsx
├── hooks/         # useAddresses, useConfirm, useTheme, useUser
├── i18n/          # Провайдер + локали (ru, uz, en)
├── screens/       # Полноэкранные компоненты
│   ├── HomeScreen.tsx        # Заказы, адреса, история, настройки
│   ├── OrderScreen.tsx       # Мастер оформления заказа (7 шагов)
│   ├── AddressFormScreen.tsx
│   ├── ExecutorScreen.tsx
│   └── RegistrationScreen.tsx
├── app.tsx        # Корень: auth flow, роутинг по состоянию
├── main.tsx       # Точка входа, initTheme
└── types.ts       # Общие TypeScript-типы
```

## Auth flow

```
Telegram.WebApp.initData
  → POST /auth/telegram
  → JWT в localStorage (TTL 24ч)
  → GET /clients/me
  → если 404 → экран регистрации
  → если 200 → HomeScreen
```

## Деплой

Push в `main` → GitHub Actions → `npm run build` → Cloudflare Pages (`alfaclean-mini-app`).

Секреты в репо: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`.
