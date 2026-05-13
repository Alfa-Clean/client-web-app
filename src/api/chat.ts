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

export function sendMediaMessage(
  orderId: string,
  file: File,
  senderId: string,
): Promise<ChatMessage> {
  const form = new FormData()
  form.append('file', new Blob([file], { type: file.type }), file.name)
  form.append('sender_type', 'client')
  form.append('sender_id', senderId)
  return apiFetch<ChatMessage>(`/orders/${orderId}/messages/media`, {
    method: 'POST',
    body: form,
  })
}
