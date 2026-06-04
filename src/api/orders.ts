import { apiFetch } from './client'

export interface OrderRating {
  score: number
  comment: string | null
  created_at: string
}

export interface TeamMember {
  executor_id: string
  name: string
  role: 'foreman' | 'cleaner'
}

export interface Order {
  id: string
  order_num: number
  status: string
  service_type: string
  housing_type?: 'apt' | 'house'
  rooms: number
  bathrooms: number
  price: number
  address: string
  order_date: string
  order_slot: string
  addons: string[]
  created_at: string
  executor_id?: string | null
  executor_name?: string | null
  comment?: string | null
  rating?: OrderRating | null
  // House order fields
  foreman_id?: string | null
  foreman_name?: string | null
  foreman_rating?: number | null
  submitted_price?: number | null
  price_comment?: string | null
  previous_price?: number | null
  team_members?: TeamMember[]
  foreman_total?: number | null
  cleaner_total?: number | null
}

export interface OrderPayload {
  telegram_id: number
  phone: string
  service_type: string
  housing_type: 'apt' | 'house'
  rooms: number
  bathrooms: number
  price: number
  address: string
  order_date: string
  order_slot: string
  source: 'bot'
  addons: string[]
  comment?: string
}

export function createOrder(data: OrderPayload): Promise<Order> {
  return apiFetch<Order>('/cleaning/orders', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export interface HandymanOrderPayload {
  description: string
  works: string[]
  order_date: string
  order_slot: string
  telegram_id?: number | null
  address_id?: string | null
  source?: 'bot' | 'manual'
}

export interface HandymanOrderResponse {
  id: string
  order_num: number
  status: string
  price: number
  created_at: string
}

export function createHandymanOrder(data: HandymanOrderPayload): Promise<HandymanOrderResponse> {
  return apiFetch<HandymanOrderResponse>('/handyman/orders', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function cancelOrder(orderId: string): Promise<Order> {
  return apiFetch<Order>(`/cleaning/orders/${orderId}/cancel`, { method: 'POST' })
}

export function acceptOrder(orderId: string): Promise<Order> {
  return apiFetch<Order>(`/cleaning/orders/${orderId}/client-confirm`, { method: 'POST' })
}

export function confirmPrice(orderId: string): Promise<Order> {
  return apiFetch<Order>(`/cleaning/orders/${orderId}/confirm-price`, { method: 'POST', body: '{}' })
}

export function rejectPrice(orderId: string, counterPrice?: number): Promise<Order> {
  return apiFetch<Order>(`/cleaning/orders/${orderId}/reject-price`, {
    method: 'POST',
    body: JSON.stringify({ counter_price: counterPrice ?? null }),
  })
}

export function rateOrder(orderId: string, score: number, comment?: string): Promise<void> {
  return apiFetch<void>(`/cleaning/orders/${orderId}/rate`, {
    method: 'POST',
    body: JSON.stringify({ score, comment: comment || null }),
  })
}

export function getUserOrders(telegramId: number): Promise<{ items: Order[]; total: number }> {
  return apiFetch<{ items: Order[]; total: number }>(
    `/cleaning/orders?telegram_id=${telegramId}&limit=20&offset=0`,
  )
}

export function submitPrice(orderId: string, price: number, description: string): Promise<Order> {
  return apiFetch<Order>(`/cleaning/orders/${orderId}/submit-price`, {
    method: 'POST',
    body: JSON.stringify({ price, description }),
  })
}

export function startCleaning(orderId: string): Promise<Order> {
  return apiFetch<Order>(`/cleaning/orders/${orderId}/start-cleaning`, { method: 'POST', body: '{}' })
}

export function finishCleaning(orderId: string): Promise<Order> {
  return apiFetch<Order>(`/cleaning/orders/${orderId}/finish-cleaning`, { method: 'POST', body: '{}' })
}

export function getBrigadierOrders(executorId: string): Promise<{ items: Order[]; total: number }> {
  return apiFetch<{ items: Order[]; total: number }>(
    `/cleaning/orders?executor_id=${executorId}&limit=50&offset=0`,
  )
}

export interface HandymanOrder {
  id: string
  order_num: number
  status: string
  description: string
  price: number
  address: string
  order_date: string
  order_slot: string
  created_at: string
  executor_id?: string | null
  executor_name?: string | null
  telegram_id?: number | null
}

export function getActiveHandymanOrders(telegramId: number): Promise<{ items: HandymanOrder[]; total: number }> {
  return apiFetch<{ items: HandymanOrder[]; total: number }>(
    `/handyman/orders?telegram_id=${telegramId}&active=true`,
  )
}

export function cancelHandymanOrder(orderId: string): Promise<HandymanOrder> {
  return apiFetch<HandymanOrder>(`/handyman/orders/${orderId}/cancel`, { method: 'POST' })
}
