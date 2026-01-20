import * as ToastPrimitive from '@radix-ui/react-toast'
import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { CheckCircle2, Info, AlertTriangle, XCircle, X } from 'lucide-react'

type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface ToastItem {
  id: string
  type: ToastType
  title: string
  description?: string
  actionLabel?: string
  onAction?: () => void
}

interface ToastContextValue {
  addToast: (toast: Omit<ToastItem, 'id'>) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const typeStyles: Record<ToastType, { icon: typeof CheckCircle2; base: string; accent: string }> = {
  success: { icon: CheckCircle2, base: 'bg-success/15 border-success/40 text-success', accent: 'text-success' },
  error: { icon: XCircle, base: 'bg-danger/15 border-danger/40 text-danger', accent: 'text-danger' },
  info: { icon: Info, base: 'bg-primary/15 border-primary/40 text-text-primary', accent: 'text-primary' },
  warning: { icon: AlertTriangle, base: 'bg-warning/15 border-warning/50 text-warning', accent: 'text-warning' },
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const addToast = useCallback((toast: Omit<ToastItem, 'id'>) => {
    setToasts((prev) => [...prev, { ...toast, id: crypto.randomUUID() }])
  }, [])

  const onOpenChange = useCallback((id: string, open: boolean) => {
    if (!open) setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const value = useMemo(() => ({ addToast }), [addToast])

  return (
    <ToastContext.Provider value={value}>
      <ToastPrimitive.Provider swipeDirection="right" duration={4000}>
        {children}
        <div className="fixed bottom-4 right-4 z-50 flex w-96 max-w-full flex-col gap-2">
          {toasts.map((toast) => {
            const variant = typeStyles[toast.type]
            const Icon = variant.icon
            return (
              <ToastPrimitive.Root
                key={toast.id}
                className={`rounded-card border px-3 py-3 shadow-lg ${variant.base}`}
                onOpenChange={(open) => onOpenChange(toast.id, open)}
                open
              >
                <div className="flex items-start gap-3">
                  <Icon className={`mt-0.5 h-5 w-5 ${variant.accent}`} />
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-text-primary">{toast.title}</div>
                    {toast.description && <div className="text-xs text-text-secondary">{toast.description}</div>}
                    {toast.actionLabel && toast.onAction && (
                      <button
                        className="mt-1 text-xs font-semibold text-primary hover:text-text-primary"
                        onClick={() => toast.onAction?.()}
                      >
                        {toast.actionLabel}
                      </button>
                    )}
                  </div>
                  <ToastPrimitive.Close asChild>
                    <button className="text-text-secondary hover:text-text-primary">
                      <X className="h-4 w-4" />
                    </button>
                  </ToastPrimitive.Close>
                </div>
              </ToastPrimitive.Root>
            )
          })}
        </div>
        <ToastPrimitive.Viewport className="sr-only" />
      </ToastPrimitive.Provider>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
