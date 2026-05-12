import { useCallback, useState } from 'preact/hooks'

interface ConfirmOptions {
  title?: string
  confirmVariant?: 'danger' | 'primary'
}

interface Pending extends ConfirmOptions {
  message: string
  resolve: (value: boolean) => void
}

export function useConfirm() {
  const [pending, setPending] = useState<Pending | null>(null)

  const confirm = useCallback((message: string, options?: ConfirmOptions): Promise<boolean> => {
    return new Promise(resolve => setPending({ message, resolve, ...options }))
  }, [])

  function accept() { pending?.resolve(true); setPending(null) }
  function dismiss() { pending?.resolve(false); setPending(null) }

  return {
    confirm,
    dialogProps: {
      open: !!pending,
      message: pending?.message ?? '',
      title: pending?.title,
      confirmVariant: pending?.confirmVariant,
      onConfirm: accept,
      onCancel: dismiss,
    },
  }
}
