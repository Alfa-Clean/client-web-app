import { createContext } from 'preact'
import { useContext, useState } from 'preact/hooks'
import type { ComponentChildren } from 'preact'
import { locales } from './locales'
import type { Lang } from './locales'

const STORAGE_KEY = 'alfaclean_lang'

function detectLang(telegramLang?: string): Lang {
  const stored = localStorage.getItem(STORAGE_KEY) as Lang | null
  if (stored && stored in locales) return stored
  if (telegramLang === 'uz') return 'uz'
  if (telegramLang === 'en') return 'en'
  return 'ru'
}

interface LocaleCtx {
  lang: Lang
  setLang: (l: Lang) => void
  t: (key: string, params?: Record<string, string | number>) => string
}

const LocaleContext = createContext<LocaleCtx>({
  lang: 'ru',
  setLang: () => {},
  t: (key) => key,
})

interface Props {
  children: ComponentChildren
  telegramLang?: string
}

export function LocaleProvider({ children, telegramLang }: Props) {
  const [lang, setLangState] = useState<Lang>(() => detectLang(telegramLang))

  function setLang(l: Lang) {
    localStorage.setItem(STORAGE_KEY, l)
    setLangState(l)
  }

  function t(key: string, params?: Record<string, string | number>): string {
    let str = locales[lang][key] ?? locales['ru'][key] ?? key
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        str = str.replace(`{${k}}`, String(v))
      }
    }
    return str
  }

  return (
    <LocaleContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LocaleContext.Provider>
  )
}

export function useLocale() {
  return useContext(LocaleContext)
}
