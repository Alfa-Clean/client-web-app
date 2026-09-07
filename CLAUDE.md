# CLAUDE.md — AlfaClean Client Web App

Telegram Mini App. Стек: Preact 10, TypeScript, Tailwind CSS v4, Vite 8.

## Команды

```bash
npm install          # зависимости
npm run dev          # dev-сервер на :3000
npm run build        # tsc + vite build → dist/
npx tsc --noEmit     # проверка типов
```

## Env

| Переменная | По умолчанию | Назначение |
|---|---|---|
| `VITE_API_URL` | `""` | Base URL API (пусто = относительные пути) |
| `API_URL` | `http://localhost:8000` | Цель Vite proxy в dev |
| `SERVICE_KEY` | — | `X-Service-Key` для dev-proxy |

## Архитектура

```
app.tsx
  Telegram (есть initData)
    → loginWithTelegram(initData) → JWT → localStorage
    → GET /clients/me
        200 → HubScreen
        404 → анонимный профиль из initData (phone: '') → HubScreen
              номер спрашивается при оформлении заказа
  Браузер (initData нет)
    → GET /clients/me по сохранённому токену
        200 → HubScreen
        401/404 → PhoneVerifyScreen (вход по номеру) → JWT → HubScreen
```

Роутинг — через `useState` (не react-router). Каждый экран получает `onBack` и рендерит следующий экран через state в родителе.

## Файлы

| Файл | Назначение |
|---|---|
| `api/client.ts` | `apiFetch`, токен (localStorage, TTL), `ApiError` |
| `api/auth.ts` | `loginWithTelegram` → JWT |
| `api/otp.ts` | Запрос и ввод кода, формат номера |
| `components/PhoneVerifyForm.tsx` | Два шага подтверждения: номер → код |
| `screens/PhoneVerifyScreen.tsx` | Полноэкранный вход по номеру (вне Telegram) |
| `api/pricing.ts` | `getQuote` → `POST /pricing/quote`, типы расчёта |
| `hooks/useQuote.ts` | Дебаунс + кеш расчёта цены, ретрай на 429 |
| `hooks/useConfirm.ts` | Promise-based confirm — возвращает `{ confirm, dialogProps }` |
| `components/ConfirmDialog.tsx` | iOS-style модалка подтверждения, спред `dialogProps` |
| `components/CalendarPicker.tsx` | Bottom sheet с grid по месяцам, только доступные даты |
| `components/WorkPickerSheet.tsx` | Drill-down по дереву разделов handyman + `SelectedWorksList` |
| `screens/OrderScreen.tsx` | Мастер заказа: 7 шагов, FSM через `step` state, draft в localStorage |
| `screens/HomeScreen.tsx` | Табы: заказы / история / адреса / настройки |

## Стили

Tailwind CSS v4 без конфига. Dark mode через CSS-переменные в `index.css` (класс `.dark` на `<html>`). `dark:` утилиты не нужны — переменные переопределяются автоматически.

```css
/* light: bg-white = #ffffff */
/* dark:  --color-white: #1c1c1e → bg-white = #1c1c1e */
```

## i18n

**Правило:** все тексты только через `t('key')`. Хардкод строк запрещён.

```tsx
// ❌
<p>Выберите дату</p>

// ✅
<p>{t('choose_date')}</p>
```

Новый ключ → добавить во **все три** локали в `i18n/locales.ts` (ru, uz, en), затем использовать.

`useLocale()` возвращает `{ t, lang, setLang }`. Язык определяется из `Telegram.WebApp.initDataUnsafe.user.language_code`.

## Модальные диалоги подтверждения

Использовать `useConfirm` вместо `window.confirm` / `window.alert`:

```tsx
const { confirm, dialogProps } = useConfirm()

// в JSX:
<ConfirmDialog
  {...dialogProps}
  confirmLabel={t('dialog_ok')}
  cancelLabel={t('dialog_cancel')}
/>

// вызов:
const ok = await confirm(t('some_message'), { confirmVariant: 'danger' })
if (!ok) return
```

## OrderScreen — шаги

```
service_type → address → rooms → bathrooms → date → addons → confirm → done
```

- Навигация: `nextStep` / `prevStep` с учётом `housingType` (house пропускает rooms/bathrooms/addons)
- Draft сохраняется в `localStorage` (`alfaclean_order_draft`) после каждого изменения
- Цены: только сервер — `useQuote(...)` → `POST /pricing/quote`. Локально цену не считать

## Расчёт цены (pricing)

`POST /api/v1/pricing/quote` — публичный, лимит 60 req/min на IP, поэтому только через
`useQuote` (дебаунс 400 мс + кеш по составу запроса + один ретрай на 429).

- `?lang=` берётся из `useLocale()` — сервер возвращает готовые `label` строк разбивки
- Невалидный промокод — это **200**, а не 422: статус читать из `promo.valid` / `promo.reason`
- Отдельный `POST /promos/validate` не нужен — `quote` уже вернул результат
- `warnings` непустой → тариф не заведён, цена неполная: показываем баннер `price_warning`
- Строки `kind: "rounding"` в разбивке скрываем, `discount` / `promo` — зелёным
- В `POST /orders` в поле `price` уходит **`total` из ответа quote**, иначе цена разъедется с прайсом
- Кнопка оформления заблокирована, пока нет актуального расчёта

Через `quote` считается **только уборка**. У handyman другой принцип расчёта — он намеренно
остаётся на локальном `calcPrice` в `HandymanOrderScreen.tsx` и на `POST /promos/validate`.

## Выбор даты (StepDateSlot)

3 чипа: Сегодня / Завтра / Другой день (открывает `CalendarPicker`).
Слоты фиксированные: `09:00–12:00`, `12:00–15:00`, `15:00–18:00`.
Все даты/слоты считаются в часовом поясе Ташкента (UTC+5), cutoff = текущее время + 3 часа.

## Подтверждение номера (OTP)

Номер подтверждается кодом из Telegram — `POST /auth/otp/request` и
`POST /auth/otp/verify` (см. ТЗ `docs/notes/otp-verification-spec.md` в монорепо).
`RegistrationScreen` и `request_contact` этой схемой отменены.

Где спрашиваем номер — зависит от точки входа:

- **Mini App** — клиент анонимен (`user.phone === ''`), профиль собран из
  `initData`. Номер спрашивается **на кнопке оформления заказа**: `handleSubmit`
  открывает шторку с `PhoneVerifyForm`, после успеха заказ уходит сразу, черновик
  не теряется. Обе вертикали — `OrderScreen` и `HandymanOrderScreen`
- **Браузер** — `PhoneVerifyScreen` при первом открытии, до заказа

Детали контракта:

- Номер уходит на бэкенд как `998XXXXXXXXX` — без плюса, пробелов и скобок
  (`toApiPhone`); ввод хранится национальной частью, форматирование — только в UI
- Код — 6 цифр, живёт 5 минут, 3 попытки ввода, пауза 60 с между отправками
- Причина отказа читается из `ApiError.reason` (`detail.reason`), детали —
  из `ApiError.context` (`retry_after`, `attempts_left`). По HTTP-статусу их не
  различить, поэтому новые ошибки OTP размечать так же
- 410 (код сгорел) возвращает форму на шаг ввода номера — догадками код не подобрать
- `verifyOtp` шлёт вместе с кодом имя из `initData`: профиль клиента заводится
  этой же ручкой, а имени взять больше негде. Уже заведённое имя бэкенд не
  перезаписывает
- Клиент, заведённый до внедрения OTP, считается подтверждённым: наличие записи
  в `/clients/me` и есть признак подтверждённого номера, отдельного флага нет

## Соглашения

- Компоненты-экраны: `props.onBack` для возврата, `props.user` если нужен пользователь
- Форматирование дат: `Intl.DateTimeFormat(LOCALE_MAP[lang], ...)` — не вручную
- Никаких `window.confirm` / `window.alert` — только `useConfirm` + `ConfirmDialog`
- Хедер OrderScreen: заголовок абсолютно центрирован (`absolute inset-x-0 text-center pointer-events-none`)
