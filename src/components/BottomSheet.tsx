import type { ComponentChildren } from 'preact'
import { useEffect, useState } from 'preact/hooks'

interface Props {
  open: boolean
  onClose: () => void
  children: ComponentChildren
}

export function BottomSheet({ open, onClose, children }: Props) {
  const [mounted, setMounted] = useState(false)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (open) {
      setMounted(true)
      document.body.style.overflow = 'hidden'
      requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)))
    } else {
      setVisible(false)
      document.body.style.overflow = ''
      const t = setTimeout(() => setMounted(false), 300)
      return () => clearTimeout(t)
    }
  }, [open])

  if (!mounted) return null

  return (
    <div class="fixed inset-0 z-50 flex flex-col justify-end">
      {/* Backdrop */}
      <div
        class="absolute inset-0 bg-black/40 transition-opacity duration-300"
        style={{ opacity: visible ? 1 : 0 }}
        onClick={onClose}
      />
      {/* Sheet */}
      <div
        class="relative bg-white rounded-t-3xl max-h-[92vh] flex flex-col transition-transform duration-300 ease-out"
        style={{ transform: visible ? 'translateY(0)' : 'translateY(100%)' }}
      >
        <div class="flex justify-center pt-3 pb-1 shrink-0">
          <div class="w-10 h-1 rounded-full bg-gray-200" />
        </div>
        <div class="overflow-y-auto flex-1">
          {children}
        </div>
      </div>
    </div>
  )
}
