import { useEffect, useRef, useState } from 'preact/hooks'
import type { Dispatch, StateUpdater } from 'preact/hooks'
import { useLocale } from '../i18n'
import { createAddress, updateAddress } from '../api/addresses'
import type { Address, AddressPayload } from '../api/addresses'
import { getSubscriptionQuote } from '../api/subscription'
import type { SubscriptionQuote } from '../api/subscription'
import { AddressOption } from '../components/AddressOption'
import { BottomSheet } from '../components/BottomSheet'
import { AddressFormScreen } from './AddressFormScreen'

interface Props {
  addresses: Address[]
  setAddresses: Dispatch<StateUpdater<Address[]>>
  onBack: () => void
  onContactSupport: () => void
}

type QuoteState = 'idle' | 'loading' | 'error' | SubscriptionQuote

const PERKS = ['subscription_perk_cleanings', 'subscription_perk_handyman'] as const

/**
 * Paywall подписки: клиент выбирает один адрес, сервер называет цену по числу
 * комнат этого адреса (`GET /me/subscription/quote`). Цену считает бэкенд,
 * а не таблица во фронте: тарифы правятся в панели.
 *
 * Оплаты на бете нет — кнопка «Подключить» неактивна. Дом, 5+ комнат и
 * старые адреса сверх лимита получают «Свяжитесь с нами»: цену там назначает
 * человек. Адрес без числа комнат — предлагаем дополнить его.
 */
export function SubscriptionScreen({ addresses, setAddresses, onBack, onContactSupport }: Props) {
  const { t } = useLocale()
  const [selectedId, setSelectedId] = useState<string | null>(addresses.length === 1 ? addresses[0].id : null)
  const [quote, setQuote] = useState<QuoteState>('idle')
  const [addressSheet, setAddressSheet] = useState<null | 'new' | Address>(null)
  // Ответ на устаревший выбор не должен перетереть цену текущего адреса.
  const requestSeq = useRef(0)

  function loadQuote(addressId: string) {
    const seq = ++requestSeq.current
    setQuote('loading')
    getSubscriptionQuote(addressId)
      .then(q => { if (seq === requestSeq.current) setQuote(q) })
      .catch(() => { if (seq === requestSeq.current) setQuote('error') })
  }

  useEffect(() => {
    if (selectedId) loadQuote(selectedId)
    else setQuote('idle')
  }, [selectedId])

  async function handleAddressSubmit(data: AddressPayload) {
    if (addressSheet === 'new') {
      const created = await createAddress(data)
      setAddresses(prev => [...prev, created])
      setSelectedId(created.id)
    } else if (addressSheet !== null) {
      // Правка создаёт новую версию адреса с новым id — заменяем по старому
      // и переводим выбор на новую версию, иначе цена считалась бы по старой.
      const previousId = addressSheet.id
      const updated = await updateAddress(previousId, data)
      setAddresses(prev => prev.map(a => a.id === previousId ? updated : a))
      setSelectedId(updated.id)
      if (previousId === updated.id) loadQuote(updated.id)
    }
    setAddressSheet(null)
  }

  const selected = addresses.find(a => a.id === selectedId) ?? null

  return (
    <div class="min-h-screen bg-gray-50 flex flex-col animate-slide-in-right">
      <BottomSheet open={addressSheet !== null} onClose={() => setAddressSheet(null)}>
        {addressSheet !== null && (
          <AddressFormScreen
            initial={addressSheet === 'new' ? undefined : addressSheet}
            onSubmit={handleAddressSubmit}
            onBack={() => setAddressSheet(null)}
          />
        )}
      </BottomSheet>

      <div class="bg-white px-4 pt-safe-5 pb-5 border-b border-gray-100 relative flex items-center justify-center">
        <button
          type="button"
          onClick={onBack}
          class="absolute left-4 w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 text-lg font-light active:bg-gray-200 transition-colors"
        >
          ‹
        </button>
        <h1 class="text-base font-bold text-gray-900">{t('subscription_title')}</h1>
      </div>

      <div class="flex-1 overflow-y-auto px-4 pt-5 pb-safe-6 flex flex-col gap-4">
        {/* Что входит */}
        <div class="rounded-2xl p-4 text-white" style="background:#1A8075">
          <p class="text-lg font-bold leading-tight">{t('subscription_headline')}</p>
          <ul class="mt-3 flex flex-col gap-2">
            {PERKS.map(key => (
              <li key={key} class="flex items-start gap-2 text-sm text-white/90">
                <span class="mt-0.5">✓</span>
                <span>{t(key)}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Выбор адреса */}
        <p class="text-[10px] font-semibold uppercase tracking-widest text-gray-400">{t('subscription_choose_address')}</p>
        {addresses.length === 0 ? (
          <div class="bg-white rounded-2xl border border-gray-100 p-4 flex flex-col gap-3">
            <p class="text-sm text-gray-600">{t('subscription_no_addresses')}</p>
            <button
              type="button"
              onClick={() => setAddressSheet('new')}
              class="w-full py-3 rounded-2xl text-sm font-semibold text-gray-900 bg-gray-100 active:bg-gray-200 transition-colors"
            >
              {t('subscription_add_address')}
            </button>
          </div>
        ) : (
          <div class="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            {addresses.map(a => (
              <AddressOption
                key={a.id}
                address={a.address}
                label={a.label}
                housingType={a.housing_type ?? 'apt'}
                active={a.id === selectedId}
                onClick={() => setSelectedId(a.id)}
              />
            ))}
          </div>
        )}

        {/* Предложение */}
        {quote === 'loading' && (
          <div class="bg-white rounded-2xl border border-gray-100 p-5 text-center text-sm text-gray-400">
            {t('subscription_loading')}
          </div>
        )}

        {quote === 'error' && selectedId && (
          <div class="bg-white rounded-2xl border border-gray-100 p-4 flex flex-col gap-3">
            <p class="text-sm text-gray-600">{t('subscription_error')}</p>
            <button
              type="button"
              onClick={() => loadQuote(selectedId)}
              class="w-full py-3 rounded-2xl text-sm font-semibold text-gray-900 bg-gray-100 active:bg-gray-200 transition-colors"
            >
              {t('dialog_retry')}
            </button>
          </div>
        )}

        {typeof quote === 'object' && quote.available && quote.price !== null && (
          <div class="bg-white rounded-2xl border border-gray-100 p-4 flex flex-col gap-3">
            {quote.rooms && (
              <p class="text-xs text-gray-400">{t('subscription_for_rooms', { rooms: quote.rooms })}</p>
            )}
            <p class="text-2xl font-bold text-gray-900 tabular-nums">
              {quote.price.toLocaleString('ru-RU')} {t('currency')}
              <span class="text-sm font-medium text-gray-400"> {t('subscription_per_month')}</span>
            </p>
            <button
              type="button"
              disabled
              class="w-full py-4 rounded-2xl text-sm font-semibold text-white disabled:opacity-40"
              style="background:#1F847B"
            >
              {t('subscription_subscribe')}
            </button>
            <p class="text-xs text-gray-400 text-center">{t('subscription_payment_soon')}</p>
          </div>
        )}

        {typeof quote === 'object' && quote.reason === 'address_incomplete' && selected && (
          <div class="bg-white rounded-2xl border border-gray-100 p-4 flex flex-col gap-3">
            <p class="text-sm text-gray-600">{t('subscription_address_incomplete')}</p>
            <button
              type="button"
              onClick={() => setAddressSheet(selected)}
              class="w-full py-3 rounded-2xl text-sm font-semibold text-gray-900 bg-gray-100 active:bg-gray-200 transition-colors"
            >
              {t('subscription_edit_address')}
            </button>
          </div>
        )}

        {typeof quote === 'object' && !quote.available && quote.reason !== 'address_incomplete' && (
          <div class="bg-white rounded-2xl border border-gray-100 p-4 flex flex-col gap-3">
            <p class="text-sm font-semibold text-gray-900">{t('subscription_contact_us')}</p>
            <p class="text-xs text-gray-500">
              {t(quote.reason === 'house' ? 'subscription_contact_house' : 'subscription_contact_large')}
            </p>
            <button
              type="button"
              onClick={onContactSupport}
              class="w-full py-4 rounded-2xl text-sm font-semibold text-white"
              style="background:#1F847B"
            >
              {t('subscription_write_support')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
