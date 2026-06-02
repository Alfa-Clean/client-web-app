import { apiFetch } from './client'

export interface OrderAttachment {
  id: string
  order_id: string
  url: string
  media_type: string
  created_at: string
}

export function uploadOrderAttachment(
  orderId: string,
  file: File,
  senderId: string,
): Promise<OrderAttachment> {
  const form = new FormData()
  form.append('file', file, file.name)
  form.append('sender_type', 'client')
  form.append('sender_id', senderId)
  return apiFetch<OrderAttachment>(`/cleaning/orders/${orderId}/attachments`, {
    method: 'POST',
    body: form,
  })
}
