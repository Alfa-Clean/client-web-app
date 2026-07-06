// Debug-конфигурация мокового Telegram-пользователя для локальной разработки.
// Источник — mock-user.json в корне проекта (в .gitignore; шаблон — mock-user.example.json).
//
// Файл подключается через import.meta.glob: если его нет (прод-сборка / CI),
// glob вернёт {} и мок будет выключен — сборка не упадёт.

export interface MockUserConfig {
  /** Включает симуляцию Telegram Mini App (подписанный initData → /auth/telegram). */
  enabled: boolean
  telegram_id: number
  first_name: string
  last_name: string
  username: string
  language_code: string
  /** Аватарка. Telegram отдаёт photo_url не всегда — пусто = инициалы. */
  photo_url: string
  /** Deep link, например "cleaning_<id>" или "booking_<key>". */
  start_param: string
}

const DEFAULTS: MockUserConfig = {
  enabled: false,
  telegram_id: 0,
  first_name: 'Dev',
  last_name: 'User',
  username: 'devuser',
  language_code: 'ru',
  photo_url: '',
  start_param: '',
}

const modules = import.meta.glob<Partial<MockUserConfig>>('../mock-user.json', {
  eager: true,
  import: 'default',
})

const loaded = Object.values(modules)[0]

export const mockConfig: MockUserConfig = { ...DEFAULTS, ...(loaded ?? {}) }

/** Мок активен только в dev и только при enabled: true в mock-user.json. */
export const MOCK_ENABLED = import.meta.env.DEV && mockConfig.enabled === true
