import type { ComponentChildren } from 'preact'

interface Props {
  open: boolean
  title?: string
  message: ComponentChildren
  confirmLabel: string
  cancelLabel: string
  confirmVariant?: 'danger' | 'primary' | 'normal' | 'green'
  cancelVariant?: 'danger' | 'normal'
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
  cancelVariant = 'normal',
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
        {confirmVariant === 'green' && !cancelLabel ? (
          <div class="px-5 pb-5">
            <button
              type="button"
              onClick={onConfirm}
              class="w-full py-3.5 rounded-2xl text-sm font-semibold text-white transition-colors active:opacity-80"
              style="background:#44973A"
            >
              {confirmLabel}
            </button>
          </div>
        ) : (
          <div class="border-t border-gray-100 flex">
            {cancelLabel && (
              <button
                type="button"
                onClick={onCancel}
                class={`flex-1 py-3.5 text-sm border-r border-gray-100 transition-colors ${
                  cancelVariant === 'danger'
                    ? 'font-bold text-red-600 hover:bg-red-50 active:bg-red-100'
                    : 'font-medium text-gray-600 hover:bg-gray-50 active:bg-gray-100'
                }`}
              >
                {cancelLabel}
              </button>
            )}
            <button
              type="button"
              onClick={onConfirm}
              class={`flex-1 py-3.5 text-sm transition-colors ${
                confirmVariant === 'danger'
                  ? 'font-semibold text-red-600 hover:bg-red-50 active:bg-red-100'
                  : confirmVariant === 'normal'
                  ? 'font-medium text-gray-900 hover:bg-gray-50 active:bg-gray-100'
                  : confirmVariant === 'green'
                  ? 'font-semibold text-[#44973A] hover:bg-green-50 active:bg-green-100'
                  : 'font-semibold text-blue-600 hover:bg-blue-50 active:bg-blue-100'
              }`}
            >
              {confirmLabel}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
