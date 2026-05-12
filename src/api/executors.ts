import { apiFetch } from './client'

export interface Executor {
  id: string
  name: string
  phone: string
  is_active: boolean
  verification_status: string
  avatar_url: string | null
  specializations: string[] | null
  districts: string[] | null
  avg_rating: number | null
  created_at: string
}

export interface Rating {
  score: number
  comment: string | null
  created_at: string
  order_id: string
}

export interface ExecutorRatings {
  avg_score: number | null
  total: number
  items: Rating[]
}

export function getExecutor(executorId: string): Promise<Executor> {
  return apiFetch<Executor>(`/executors/${executorId}`)
}

export function getExecutorRatings(executorId: string): Promise<ExecutorRatings> {
  return apiFetch<ExecutorRatings>(`/executors/${executorId}/ratings?limit=20`)
}
