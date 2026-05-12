import { apiFetch } from './client'

export interface ChatMessage {
  id: string
  order_id: string
  sender_type: 'client' | 'executor' | 'system'
  sender_id: string
  content: string | null
  media_url: string | null
  media_type: string | null
  created_at: string
}

export interface ChatMessagesResponse {
  total: number
  limit: number
  offset: number
  items: ChatMessage[]
}

export function getMessages(orderId: string, limit = 50, offset = 0): Promise<ChatMessagesResponse> {
  return apiFetch<ChatMessagesResponse>(
    `/orders/${orderId}/messages?limit=${limit}&offset=${offset}`,
  )
}

export function sendMessage(
  orderId: string,
  content: string,
  senderId: string,
): Promise<ChatMessage> {
  return apiFetch<ChatMessage>(`/orders/${orderId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ sender_type: 'client', sender_id: senderId, content }),
  })
}
