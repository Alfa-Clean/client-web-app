import { apiFetch } from './client'

export type ContextType = 'cleaning_order' | 'handyman_order' | 'support'
export type ConversationState = 'open' | 'closed'
export type SenderType = 'client' | 'executor' | 'support' | 'system'
export type MessageKind = 'text' | 'media' | 'event'
export type EventType =
  | 'assigned' | 'on_the_way' | 'arrived' | 'started'
  | 'awaiting_confirmation' | 'done' | 'cancelled' | 'disputed'

export interface Conversation {
  id: string
  context_type: ContextType
  context_id: string
  state: ConversationState
  created_at: string
}

export interface ConversationMessage {
  id: string
  conversation_id: string
  sender_type: SenderType
  sender_id: string
  kind: MessageKind
  event_type: EventType | null
  content: string | null
  media_url: string | null
  media_type: string | null
  payload: Record<string, unknown> | null
  created_at: string
}

export interface ConversationMessagesResponse {
  total: number
  limit: number
  offset: number
  items: ConversationMessage[]
}

export function getOrCreateConversation(
  contextType: ContextType,
  contextId: string,
): Promise<Conversation> {
  return apiFetch<Conversation>('/conversations', {
    method: 'POST',
    body: JSON.stringify({ context_type: contextType, context_id: contextId }),
  })
}

export function getConversationMessages(
  conversationId: string,
  limit = 50,
  offset = 0,
): Promise<ConversationMessagesResponse> {
  return apiFetch<ConversationMessagesResponse>(
    `/conversations/${conversationId}/messages?limit=${limit}&offset=${offset}`,
  )
}

export function sendConversationMessage(
  conversationId: string,
  content: string,
  senderId: string,
): Promise<ConversationMessage> {
  return apiFetch<ConversationMessage>(`/conversations/${conversationId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ sender_type: 'client', sender_id: senderId, content }),
  })
}

export function sendConversationMedia(
  conversationId: string,
  file: File,
  senderId: string,
): Promise<ConversationMessage> {
  const form = new FormData()
  form.append('file', file, file.name)
  form.append('sender_type', 'client')
  form.append('sender_id', senderId)
  return apiFetch<ConversationMessage>(`/conversations/${conversationId}/messages/media`, {
    method: 'POST',
    body: form,
  })
}
