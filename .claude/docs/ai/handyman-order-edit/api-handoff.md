# API Handoff: Handyman Order Edit

## Business Context
Клиент может редактировать параметры активного заказа хэндимена после его создания — до тех пор, пока мастер не приступил к работе (статусы `new` и `assigned`). При статусе `assigned` (мастер назначен, но ещё не выехал) доступно ограниченное редактирование: только описание задачи и список работ. При изменении списка работ цена пересчитывается автоматически на бэкенде.

## Endpoints

### PATCH /handyman/orders/{order_id}
- **Purpose**: Частичное обновление заказа клиентом
- **Auth**: public (внутренний сервис, без токенов)
- **Request**:
  ```json
  {
    "order_date": "2026-06-15",
    "order_slot": "10:00–13:00",
    "address_id": "uuid",
    "description": "Поменять розетки на кухне и в зале",
    "works": ["work-uuid-1", "work-uuid-2"]
  }
  ```
  Все поля опциональны — передавай только изменённые.

- **Response** (200 — полный объект заказа):
  ```json
  {
    "id": "uuid",
    "telegram_id": 123456789,
    "order_num": 42,
    "description": "Поменять розетки на кухне и в зале",
    "price": 250000,
    "address_id": "uuid",
    "address": "ул. Навои, 5",
    "entrance": "2",
    "floor": 4,
    "apartment": "18",
    "intercom": "18#",
    "order_date": "2026-06-15",
    "order_slot": "10:00–13:00",
    "source": "bot",
    "status": "new",
    "executor_id": null,
    "decline_count": 0,
    "latitude": 41.2995,
    "longitude": 69.2401,
    "geo_address": "ул. Навои, 5",
    "works": [
      {
        "work_id": "work-uuid-1",
        "translations": { "ru": "Замена розетки", "uz": "Rozetka almashtirish" }
      }
    ],
    "attachments": [],
    "created_at": "2026-06-08T10:00:00+05:00"
  }
  ```

- **Response** (ошибки):
  | Код | Причина |
  |-----|---------|
  | 404 | Заказ не найден |
  | 409 | Статус не позволяет редактирование (не `new`/`assigned`) |
  | 409 | При `assigned` переданы поля кроме `description`/`works` |
  | 422 | Пустое тело (нет полей для обновления) |
  | 422 | В `works` переданы несуществующие ID работ |

- **Notes**:
  - Если передан `works` — цена пересчитывается автоматически; фронт не должен передавать `price`.
  - Ответ всегда содержит полный объект заказа с актуальной ценой.
  - `address_id` — UUID из таблицы `addresses` (геокодинг уже выполнен при создании адреса).

## Data Models / DTOs

```typescript
interface HandymanOrderPatchRequest {
  order_date?: string;       // "YYYY-MM-DD"
  order_slot?: string;       // например "10:00–13:00"
  address_id?: string;       // UUID
  description?: string;
  works?: string[];          // массив UUID работ (минимум 1 если передаётся)
}

interface HandymanOrderWork {
  work_id: string;
  translations: Record<string, string>;  // { "ru": "...", "uz": "..." }
}

interface HandymanOrder {
  id: string;
  telegram_id: number | null;
  order_num: number;
  description: string;
  price: number;             // в сумах, пересчитывается при смене works
  address_id: string | null;
  address: string | null;
  entrance: string | null;
  floor: number | null;
  apartment: string | null;
  intercom: string | null;
  order_date: string;        // "YYYY-MM-DD"
  order_slot: string;
  source: "bot" | "manual";
  status: HandymanOrderStatus;
  executor_id: string | null;
  decline_count: number;
  latitude: number | null;
  longitude: number | null;
  geo_address: string | null;
  works: HandymanOrderWork[];
  attachments: unknown[];
  created_at: string;        // ISO 8601
}
```

## Enums & Constants

| Значение | Смысл | Редактирование разрешено |
|---------|-------|--------------------------|
| `new` | Заказ создан, мастер не назначен | Все поля |
| `assigned` | Мастер назначен, ещё не выехал | Только `description`, `works` |
| `on_the_way` | Мастер выехал | ❌ |
| `arrived` | Мастер прибыл | ❌ |
| `in_progress` | Работа идёт | ❌ |
| `awaiting_confirmation` | Ожидает подтверждения клиента | ❌ |
| `completed` | Завершён | ❌ |
| `disputed` | Спор | ❌ |
| `cancelled` | Отменён | ❌ |

## Validation Rules

| Поле | Правило |
|------|---------|
| `order_date` | Формат `YYYY-MM-DD` |
| `works` | Все ID должны существовать в справочнике работ |
| Тело запроса | Хотя бы одно поле обязательно |

## Business Logic & Edge Cases

- **Автопересчёт цены**: при передаче `works` бэк заменяет весь список работ и пересчитывает `price` как сумму цен. Старые работы удаляются, новые вставляются. Фронт должен отображать новую цену из ответа.
- **Статус `assigned`**: показывай предупреждение ("Мастер уже назначен — дату и адрес изменить нельзя") и скрывай/блокируй поля `order_date`, `order_slot`, `address_id`.
- **Предпросмотр цены**: чтобы показать новую цену до сохранения, вызови `GET /handyman/works` и посчитай сумму на фронте — бэк не предоставляет отдельного endpoint для расчёта.
- **Пустой PATCH**: если пользователь нажал "Сохранить" без изменений — не отправляй запрос (бэк вернёт 422).

## Integration Notes

- **Рекомендуемый флоу**: `GET /handyman/orders/{id}` → отобразить текущие данные → пользователь редактирует → `PATCH /handyman/orders/{id}` с только изменёнными полями → обновить экран активного заказа из ответа.
- **Оптимистичный UI**: не рекомендуется — цена может измениться на бэке.
- **После успеха**: вернуть пользователя на экран активного заказа, данные уже в ответе PATCH (не нужен повторный GET).

## Test Scenarios

1. **Happy path (статус `new`)**: изменить дату, слот и список работ → 200, новая цена в ответе.
2. **Happy path (статус `assigned`, ограниченное редактирование)**: изменить только `description` → 200.
3. **Попытка изменить дату при `assigned`**: передать `order_date` → 409 `"Only description and works can be modified after executor is assigned"`.
4. **Неверный статус**: заказ в `on_the_way` → 409 `"Order cannot be modified in current status"`.
5. **Несуществующие works**: передать невалидный UUID в `works` → 422 `"Unknown works: [...]"`.
6. **Пустое тело**: `{}` → 422 `"No fields to update"`.
7. **Несуществующий заказ**: → 404 `"Order not found"`.

## Open Questions / TODOs

- Нужно ли показывать diff цены ("было / стало") перед сохранением при изменении `works`? Реализуемо на фронте через `GET /handyman/works`.
- Стоит ли блокировать кнопку "Сохранить" при `on_the_way` и выше, или показывать экран только для разрешённых статусов?
