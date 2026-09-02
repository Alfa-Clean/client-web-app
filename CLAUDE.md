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
  → loginWithTelegram(initData) → JWT → localStorage
  → GET /clients/me
      404 → RegistrationScreen → POST /clients → HomeScreen
      200 → HomeScreen
```

Роутинг — через `useState` (не react-router). Каждый экран получает `onBack` и рендерит следующий экран через state в родителе.

## Файлы

| Файл | Назначение |
|---|---|
| `api/client.ts` | `apiFetch`, токен (localStorage, TTL), `ApiError` |
| `api/auth.ts` | `loginWithTelegram` → JWT |
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

## Соглашения

- Компоненты-экраны: `props.onBack` для возврата, `props.user` если нужен пользователь
- Форматирование дат: `Intl.DateTimeFormat(LOCALE_MAP[lang], ...)` — не вручную
- Никаких `window.confirm` / `window.alert` — только `useConfirm` + `ConfirmDialog`
- Хедер OrderScreen: заголовок абсолютно центрирован (`absolute inset-x-0 text-center pointer-events-none`)
