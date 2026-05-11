import { apiFetch } from './client'

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

export function getUserOrders(telegramId: number): Promise<{ items: Order[]; total: number }> {
  return apiFetch<{ items: Order[]; total: number }>(
    `/orders?telegram_id=${telegramId}&limit=20&offset=0`,
  )
}
