import type { ComponentChildren } from 'preact'

interface Props {
  open: boolean
  title?: string
  message: ComponentChildren
  confirmLabel: string
  cancelLabel: string
  confirmVariant?: 'danger' | 'primary'
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  confirmVariant = 'primary',
  onConfirm,
  onCancel,
}: Props) {
  if (!open) return null

  return (
    <div class="fixed inset-0 z-50 flex items-center justify-center p-6" onClick={onCancel}>
      <div class="absolute inset-0 bg-black/50 animate-fade-in" />
      <div
        class="relative w-full max-w-xs bg-white rounded-2xl shadow-2xl overflow-hidden animate-scale-in"
        onClick={e => e.stopPropagation()}
      >
        <div class="px-6 pt-6 pb-5 text-center">
          {title && (
            <p class="text-base font-semibold text-gray-900 mb-1">{title}</p>
          )}
          <p class={`text-sm leading-relaxed whitespace-pre-line ${title ? 'text-gray-500' : 'font-medium text-gray-900'}`}>
            {message}
          </p>
        </div>
        <div class="border-t border-gray-100 flex">
          <button
            type="button"
            onClick={onCancel}
            class="flex-1 py-3.5 text-sm font-medium text-gray-600 border-r border-gray-100 hover:bg-gray-50 active:bg-gray-100 transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            class={`flex-1 py-3.5 text-sm font-semibold transition-colors ${
              confirmVariant === 'danger'
                ? 'text-red-600 hover:bg-red-50 active:bg-red-100'
                : 'text-blue-600 hover:bg-blue-50 active:bg-blue-100'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
