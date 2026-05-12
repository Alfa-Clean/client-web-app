import { useEffect, useState } from 'preact/hooks'
import type { Executor, ExecutorRatings } from '../api/executors'
import { getExecutor, getExecutorRatings } from '../api/executors'
import { useExitBack } from '../hooks/useExitBack'

interface Props {
  executorId: string
  onBack: () => void
}

function Stars({ score }: { score: number }) {
  return (
    <span>
      {[1, 2, 3, 4, 5].map(i => (
        <span key={i} class={i <= Math.round(score) ? 'text-yellow-400' : 'text-gray-200'}>★</span>
      ))}
    </span>
  )
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
}

export function ExecutorScreen({ executorId, onBack }: Props) {
  const [executor, setExecutor] = useState<Executor | null>(null)
  const [ratings, setRatings] = useState<ExecutorRatings | null>(null)
  const [loading, setLoading] = useState(true)
  const { exiting, handleBack } = useExitBack(onBack)

  useEffect(() => {
    Promise.all([getExecutor(executorId), getExecutorRatings(executorId)])
      .then(([e, r]) => { setExecutor(e); setRatings(r) })
      .finally(() => setLoading(false))
  }, [executorId])

  return (
    <div class={`min-h-screen bg-gray-50 flex flex-col ${exiting ? 'animate-slide-out-right' : 'animate-slide-in-right'}`}>
      {/* Header */}
      <div class="bg-white px-4 py-4 border-b border-gray-100 flex items-center gap-3">
        <button type="button" onClick={handleBack} class="text-blue-600 text-sm font-medium shrink-0">
          ← Назад
        </button>
        <h1 class="text-base font-semibold text-gray-900 flex-1 truncate">Клинер</h1>
      </div>

      {loading && (
        <div class="flex-1 flex items-center justify-center">
          <p class="text-sm text-gray-400">Загрузка...</p>
        </div>
      )}

      {!loading && executor && (
        <div class="flex-1 overflow-y-auto">
          {/* Profile hero */}
          <div class="bg-white px-5 py-6 flex items-center gap-4 border-b border-gray-100">
            {executor.avatar_url ? (
              <img
                src={executor.avatar_url}
                alt={executor.name}
                class="w-20 h-20 rounded-2xl object-cover bg-gray-100 shrink-0"
              />
            ) : (
              <div class="w-20 h-20 rounded-2xl bg-blue-100 flex items-center justify-center shrink-0">
                <span class="text-3xl">🧹</span>
              </div>
            )}
            <div class="flex-1 min-w-0">
              <h2 class="text-lg font-semibold text-gray-900">{executor.name}</h2>
              {executor.avg_rating != null && (
                <div class="flex items-center gap-1.5 mt-1">
                  <Stars score={executor.avg_rating} />
                  <span class="text-sm font-semibold text-gray-700">
                    {executor.avg_rating.toFixed(1)}
                  </span>
                  {ratings && (
                    <span class="text-xs text-gray-400">({ratings.total} отзывов)</span>
                  )}
                </div>
              )}
              <span class={`mt-1.5 inline-block text-xs font-medium px-2 py-0.5 rounded-full ${
                executor.verification_status === 'verified'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-500'
              }`}>
                {executor.verification_status === 'verified' ? '✓ Проверен' : 'На проверке'}
              </span>
            </div>
          </div>

          {/* Info */}
          <div class="mx-4 mt-4 bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
            {executor.specializations && executor.specializations.length > 0 && (
              <div class="px-4 py-3">
                <p class="text-xs text-gray-400 mb-1.5">Специализации</p>
                <div class="flex flex-wrap gap-1.5">
                  {executor.specializations.map(s => (
                    <span key={s} class="text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full font-medium">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {executor.districts && executor.districts.length > 0 && (
              <div class="px-4 py-3">
                <p class="text-xs text-gray-400 mb-1.5">Районы работы</p>
                <div class="flex flex-wrap gap-1.5">
                  {executor.districts.map(d => (
                    <span key={d} class="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full font-medium">
                      📍 {d}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <div class="px-4 py-3 flex items-center justify-between">
              <p class="text-xs text-gray-400">Работает с</p>
              <p class="text-sm text-gray-700">{formatDate(executor.created_at)}</p>
            </div>
          </div>

          {/* Ratings */}
          <div class="mx-4 mt-4 mb-6">
            <p class="text-sm font-medium text-gray-500 mb-3">Отзывы</p>

            {(!ratings || ratings.total === 0) && (
              <p class="text-sm text-gray-400 text-center py-6">Отзывов пока нет</p>
            )}

            {ratings && ratings.items.map((r, i) => (
              <div key={i} class="bg-white rounded-2xl border border-gray-100 p-4 mb-2">
                <div class="flex items-center justify-between mb-1.5">
                  <Stars score={r.score} />
                  <span class="text-xs text-gray-400">{formatDate(r.created_at)}</span>
                </div>
                {r.comment && (
                  <p class="text-sm text-gray-700 leading-relaxed">{r.comment}</p>
                )}
                {!r.comment && (
                  <p class="text-xs text-gray-400 italic">Без комментария</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
