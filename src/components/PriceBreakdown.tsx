import type { PriceLine, QuoteResponse } from '../api/pricing'
import { useLocale } from '../i18n'

/** Строки расчёта для показа: без округления и пустых позиций. */
export function visibleLines(lines: PriceLine[]): PriceLine[] {
  return lines.filter(l => l.kind !== 'rounding' && l.amount !== 0)
}

export function fmtPrice(p: number, currency: string): string {
  return p.toLocaleString('ru-RU') + ' ' + currency
}

interface Props {
  quote: QuoteResponse | null
  loading: boolean
  error: boolean
}

/**
 * Разбивка стоимости из расчёта сервера (`POST /pricing/quote`). Общая для
 * заказа уборки и мастера: цену считает сервер, экран только показывает
 * строки — наценку за срочность, скидку новичка, промокод.
 */
export function PriceBreakdown({ quote, loading, error }: Props) {
  const { t } = useLocale()
  // Непустой warnings = тариф не заведён, цена неполная.
  const incomplete = (quote?.warnings.length ?? 0) > 0

  return (
    <div class="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      {error && !quote ? (
        <p class="px-4 py-3 text-sm text-red-500">{t('price_error')}</p>
      ) : !quote ? (
        <p class="px-4 py-3 text-sm text-gray-400">{t('price_calculating')}</p>
      ) : (
        <>
          <div class={`divide-y divide-gray-50 transition-opacity ${loading ? 'opacity-50' : ''}`}>
            {visibleLines(quote.lines).map(line => (
              <div key={`${line.code}-${line.kind}`} class="flex items-start justify-between gap-3 px-4 py-2.5">
                <span class="text-sm text-gray-700 min-w-0">
                  {line.label}
                  {line.qty > 1 && <span class="text-gray-400"> × {line.qty}</span>}
                </span>
                <span
                  class={`text-sm shrink-0 ${
                    line.kind === 'discount' || line.kind === 'promo'
                      ? 'text-[#1F847B]'
                      : 'text-gray-900'
                  }`}
                >
                  {line.amount < 0 ? '−' : ''}{fmtPrice(Math.abs(line.amount), t('currency'))}
                </span>
              </div>
            ))}
            <div class="flex items-center justify-between px-4 py-3 bg-gray-50">
              <span class="text-sm font-medium text-gray-700">{t('confirm_total')}</span>
              <span class="text-sm font-bold text-gray-900">
                {fmtPrice(quote.total, t('currency'))}
              </span>
            </div>
          </div>
          {incomplete && (
            <p class="px-4 py-2.5 text-xs text-amber-600 bg-amber-50 border-t border-amber-100">
              {t('price_warning')}
            </p>
          )}
        </>
      )}
    </div>
  )
}
