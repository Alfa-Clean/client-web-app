import { apiFetch } from './client'

export type PromoInvalidReason =
  | 'not_found'
  | 'inactive'
  | 'not_started'
  | 'expired'
  | 'wrong_service_type'
  | 'already_used'

export interface PromoValidateResult {
  valid: boolean
  reason?: PromoInvalidReason
  promo_id?: string
  code?: string
  campaign?: string
  discount_pct?: number
  service_type?: string | null
}

export function validatePromo(
  code: string,
  userId: number,
  serviceType: string,
): Promise<PromoValidateResult> {
  return apiFetch<PromoValidateResult>('/promos/validate', {
    method: 'POST',
    body: JSON.stringify({ code, user_id: userId, service_type: serviceType }),
  })
}
