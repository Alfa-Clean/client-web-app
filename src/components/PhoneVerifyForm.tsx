import { useEffect, useRef, useState } from 'preact/hooks'
import { useLocale } from '../i18n'
import { ApiError, NetworkError } from '../api/client'
import {
  CODE_LENGTH,
  formatNationalPhone,
  isCompletePhone,
  normalizePhoneInput,
  requestOtp,
  toApiPhone,
  verifyOtp,
} from '../api/otp'
import type { OtpVerifyResponse } from '../api/otp'
import { normalizeUser } from '../types'
import type { User } from '../types'
import { Spinner } from './Spinner'

interface Props {
  /**
   * Успешное подтверждение: токен уже сохранён, наверх уходит профиль клиента
   * и ответ ручки целиком.
   */
  onVerified: (client: User, result: OtpVerifyResponse) => void | Promise<void>
  /** Номер, с которого начинать (национальная часть, без 998). */
  initialPhone?: string
}

type Step = 'phone' | 'code'

const BRAND = 'background:#1F847B'

/**
 * Два шага в одном компоненте: ввод номера и ввод кода. Используется и на
 * отдельном экране (браузер, вход по номеру), и в шторке при оформлении заказа
 * (Mini App) — поэтому здесь нет ни хедера, ни кнопки «назад».
 */
export function PhoneVerifyForm({ onVerified, initialPhone = '' }: Props) {
  const { t, lang } = useLocale()
  const [step, setStep] = useState<Step>('phone')
  const [phone, setPhone] = useState(normalizePhoneInput(initialPhone))
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cooldown, setCooldown] = useState(0)
  const codeInputRef = useRef<HTMLInputElement>(null)

  // Обратный отсчёт до повторной отправки: бэкенд держит паузу в 60 секунд и
  // возвращает её в retry_after, включая случай отказа по этой же паузе.
  useEffect(() => {
    if (cooldown <= 0) return
    const id = setInterval(() => setCooldown(prev => (prev <= 1 ? 0 : prev - 1)), 1000)
    return () => clearInterval(id)
  }, [cooldown > 0])

  useEffect(() => {
    if (step === 'code') codeInputRef.current?.focus()
  }, [step])

  function describe(e: unknown): string {
    if (e instanceof NetworkError) return t('error_no_connection')
    if (!(e instanceof ApiError)) return t('otp_error_generic')

    const seconds = Number(e.context.retry_after)
    switch (e.reason) {
      case 'otp_cooldown':
        return t('otp_error_cooldown', { sec: Number.isFinite(seconds) ? seconds : 60 })
      case 'otp_rate_limited':
        return t('otp_error_rate_limited')
      case 'otp_invalid':
        return t('otp_error_code_invalid', { left: Number(e.context.attempts_left) || 0 })
      case 'otp_expired':
        return t('otp_error_expired')
      case 'delivery_failed':
        return t('otp_error_delivery')
      case 'phone_taken':
        return t('otp_error_phone_taken')
    }

    if (e.status === 422) return t('otp_error_phone_invalid')
    if (e.status === 429) return t('otp_error_rate_limited')
    return t('otp_error_generic')
  }

  async function sendCode() {
    if (!isCompletePhone(phone) || busy || cooldown > 0) return
    setBusy(true)
    setError(null)
    try {
      const res = await requestOtp(toApiPhone(phone), lang)
      setCooldown(res.retry_after)
      setCode('')
      setStep('code')
    } catch (e) {
      setError(describe(e))
      // Отказ по паузе тоже сообщает, сколько ждать — заводим тот же счётчик.
      if (e instanceof ApiError && e.status === 429) {
        const seconds = Number(e.context.retry_after)
        if (Number.isFinite(seconds) && seconds > 0) setCooldown(seconds)
      }
    } finally {
      setBusy(false)
    }
  }

  async function submitCode() {
    if (code.length !== CODE_LENGTH || busy) return
    setBusy(true)
    setError(null)
    try {
      const res = await verifyOtp(toApiPhone(phone), code)
      await onVerified(normalizeUser(res.client), res)
    } catch (e) {
      setError(describe(e))
      setCode('')
      // Код сгорел (истёк или кончились попытки) — новый шанс только через новый код.
      if (e instanceof ApiError && e.status === 410) setStep('phone')
    } finally {
      setBusy(false)
    }
  }

  if (step === 'phone') {
    return (
      <div class="flex flex-col gap-4">
        <div>
          <h2 class="text-2xl font-bold text-gray-900">{t('otp_phone_title')}</h2>
        </div>
        <label class="flex flex-col gap-1.5">
          <div class="flex items-center gap-1 bg-white border border-gray-200 rounded-2xl px-4 py-3.5 focus-within:border-[#1F847B] transition-colors">
            <span class="text-sm text-gray-400 shrink-0">+998</span>
            <input
              type="tel"
              inputMode="numeric"
              autocomplete="tel-national"
              value={formatNationalPhone(phone)}
              onInput={e => {
                setPhone(normalizePhoneInput((e.target as HTMLInputElement).value))
                setError(null)
              }}
              onKeyDown={e => { if (e.key === 'Enter') sendCode() }}
              placeholder="90 123 45 67"
              class="flex-1 min-w-0 bg-transparent text-sm text-gray-900 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none"
            />
          </div>
          <span class="text-xs text-gray-400">{t('otp_phone_hint_telegram')}</span>
        </label>

        <button
          type="button"
          onClick={sendCode}
          disabled={!isCompletePhone(phone) || busy || cooldown > 0}
          class="w-full flex items-center justify-center text-white font-semibold py-4 px-6 rounded-2xl transition-colors text-base disabled:opacity-50"
          style={BRAND}
        >
          {busy && <Spinner size={18} class="border-white" />}
          {busy
            ? t('otp_loading')
            : cooldown > 0
              ? t('otp_resend_in', { sec: cooldown })
              : t('otp_send_code')}
        </button>

        {error && <p class="text-red-500 text-sm text-center">{error}</p>}
      </div>
    )
  }

  return (
    <div class="flex flex-col gap-4">
      <div>
        <h2 class="text-2xl font-bold text-gray-900">{t('otp_code_title')}</h2>
        <p class="text-sm text-gray-400 mt-1 leading-relaxed">
          {t('otp_code_subtitle', { phone: `+998 ${formatNationalPhone(phone)}` })}
        </p>
      </div>

      <label class="flex flex-col gap-1.5">
        <span class="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
          {t('otp_code_label')}
        </span>
        <input
          ref={codeInputRef}
          type="text"
          inputMode="numeric"
          autocomplete="one-time-code"
          value={code}
          maxLength={CODE_LENGTH}
          onInput={e => {
            setCode((e.target as HTMLInputElement).value.replace(/\D/g, '').slice(0, CODE_LENGTH))
            setError(null)
          }}
          onKeyDown={e => { if (e.key === 'Enter') submitCode() }}
          placeholder="000000"
          class="w-full bg-white border border-gray-200 rounded-2xl px-4 py-3.5 text-center text-xl font-semibold tracking-[0.5em] text-gray-900 placeholder-gray-300 dark:placeholder-gray-600 focus:outline-none focus:border-[#1F847B] transition-colors"
        />
      </label>

      <button
        type="button"
        onClick={submitCode}
        disabled={code.length !== CODE_LENGTH || busy}
        class="w-full flex items-center justify-center gap-2 text-white font-semibold py-4 px-6 rounded-2xl transition-colors text-base disabled:opacity-50"
        style={BRAND}
      >
        {busy && <Spinner size={18} class="border-white" />}
        {busy ? t('otp_loading') : t('otp_confirm')}
      </button>

      {error && <p class="text-red-500 text-sm text-center">{error}</p>}

      <button
        type="button"
        onClick={sendCode}
        disabled={busy || cooldown > 0}
        class="text-sm text-gray-400 text-center transition-colors disabled:opacity-60"
      >
        {cooldown > 0 ? t('otp_resend_in', { sec: cooldown }) : t('otp_resend')}
      </button>

      <button
        type="button"
        onClick={() => { setStep('phone'); setCode(''); setError(null) }}
        class="text-sm text-gray-400 text-center transition-colors"
      >
        {t('otp_change_phone')}
      </button>
    </div>
  )
}
