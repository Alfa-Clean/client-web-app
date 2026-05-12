import { apiFetch } from './client'

export interface OrderRating {
  score: number
  comment: string | null
  created_at: string
}

export interface Order {
  id: string
  order_num: number
  status: string
  service_type: string
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
}

export interface OrderPayload {
  telegram_id: number
  phone: string
  service_type: string
  rooms: number
  bathrooms: number
  price: number
  address: string
  order_date: string
  order_slot: string
  source: 'bot'
  addons: string[]
}

export function createOrder(data: OrderPayload): Promise<Order> {
  return apiFetch<Order>('/orders', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function cancelOrder(orderId: string): Promise<Order> {
  return apiFetch<Order>(`/orders/${orderId}/cancel`, { method: 'POST' })
}

export function acceptOrder(orderId: string): Promise<Order> {
  return apiFetch<Order>(`/orders/${orderId}/client-confirm`, { method: 'POST' })
}

export function rateOrder(orderId: string, score: number, comment?: string): Promise<void> {
  return apiFetch<void>(`/orders/${orderId}/rate`, {
    method: 'POST',
    body: JSON.stringify({ score, comment: comment || null }),
  })
}

export function getUserOrders(telegramId: number): Promise<{ items: Order[]; total: number }> {
  return apiFetch<{ items: Order[]; total: number }>(
    `/orders?telegram_id=${telegramId}&limit=20&offset=0`,
  )
}
