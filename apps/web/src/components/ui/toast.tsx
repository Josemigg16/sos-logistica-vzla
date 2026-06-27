import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { CheckCircle2, AlertTriangle, Info, X, XCircle } from 'lucide-react'

export type ToastVariant = 'success' | 'error' | 'info' | 'warning'

export interface Toast {
  id: string
  title: string
  description?: string
  variant: ToastVariant
  duration: number
}

interface ToastContextValue {
  toast: (options: { title: string; description?: string; variant?: ToastVariant; duration?: number }) => string
  success: (title: string, description?: string) => string
  error: (title: string, description?: string) => string
  info: (title: string, description?: string) => string
  warning: (title: string, description?: string) => string
  dismiss: (id: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast debe usarse dentro de <ToastProvider>')
  return ctx
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const toast = useCallback(
    (options: { title: string; description?: string; variant?: ToastVariant; duration?: number }): string => {
      const id = `t_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
      const next: Toast = {
        id,
        title: options.title,
        description: options.description,
        variant: options.variant ?? 'info',
        duration: options.duration ?? 4000,
      }
      setToasts((prev) => [...prev, next])
      return id
    },
    [],
  )

  const value = useMemo<ToastContextValue>(
    () => ({
      toast,
      dismiss,
      success: (title, description) => toast({ title, description, variant: 'success' }),
      error: (title, description) => toast({ title, description, variant: 'error', duration: 6000 }),
      info: (title, description) => toast({ title, description, variant: 'info' }),
      warning: (title, description) => toast({ title, description, variant: 'warning', duration: 5000 }),
    }),
    [toast, dismiss],
  )

  return (
    <ToastContext.Provider value={value}>
      {children}
      <Toaster toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  )
}

const VARIANT_STYLES: Record<ToastVariant, {
  border: string
  bg: string
  iconBg: string
  iconColor: string
  accent: string
  Icon: typeof CheckCircle2
}> = {
  success: {
    border: 'border-emerald-400/40',
    bg: 'bg-[#0F2337]/95',
    iconBg: 'bg-emerald-400/15',
    iconColor: 'text-emerald-300',
    accent: 'bg-emerald-400',
    Icon: CheckCircle2,
  },
  error: {
    border: 'border-red-400/40',
    bg: 'bg-[#0F2337]/95',
    iconBg: 'bg-red-400/15',
    iconColor: 'text-red-300',
    accent: 'bg-red-400',
    Icon: XCircle,
  },
  warning: {
    border: 'border-amber-400/40',
    bg: 'bg-[#0F2337]/95',
    iconBg: 'bg-amber-400/15',
    iconColor: 'text-amber-300',
    accent: 'bg-amber-400',
    Icon: AlertTriangle,
  },
  info: {
    border: 'border-[#4A89C0]/40',
    bg: 'bg-[#0F2337]/95',
    iconBg: 'bg-[#4A89C0]/15',
    iconColor: 'text-[#C8DCF0]',
    accent: 'bg-[#4A89C0]',
    Icon: Info,
  },
}

function Toaster({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: string) => void }) {
  if (typeof document === 'undefined') return null
  return createPortal(
    <div
      className="pointer-events-none fixed top-4 right-4 z-[200] flex flex-col gap-2 w-[min(92vw,380px)]"
      role="region"
      aria-label="Notificaciones"
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={() => onDismiss(t.id)} />
      ))}
      <ToastAnimations />
    </div>,
    document.body,
  )
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const cfg = VARIANT_STYLES[toast.variant]
  const Icon = cfg.Icon
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [closing, setClosing] = useState(false)

  const close = useCallback(() => {
    if (closing) return
    setClosing(true)
    setTimeout(onDismiss, 180)
  }, [closing, onDismiss])

  useEffect(() => {
    timerRef.current = setTimeout(close, toast.duration)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [toast.duration, close])

  const pause = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }
  const resume = () => {
    if (!timerRef.current && !closing) {
      timerRef.current = setTimeout(close, 1500)
    }
  }

  return (
    <div
      role="status"
      aria-live="polite"
      onMouseEnter={pause}
      onMouseLeave={resume}
      className={`pointer-events-auto relative overflow-hidden flex items-start gap-3 p-3.5 rounded-xl border backdrop-blur-md shadow-[0_12px_40px_rgba(15,35,55,0.6)] ${cfg.border} ${cfg.bg} ${closing ? 'animate-toast-out' : 'animate-toast-in'}`}
    >
      <span className={`absolute left-0 top-0 bottom-0 w-1 ${cfg.accent}`} aria-hidden />
      <div className={`flex items-center justify-center w-9 h-9 rounded-lg shrink-0 ${cfg.iconBg} ${cfg.iconColor}`}>
        <Icon className="w-4.5 h-4.5" strokeWidth={2.2} />
      </div>
      <div className="flex-1 min-w-0 pt-0.5">
        <p className="text-[13px] font-semibold text-white leading-snug">{toast.title}</p>
        {toast.description && (
          <p className="text-[11px] text-white/60 mt-0.5 leading-relaxed">{toast.description}</p>
        )}
      </div>
      <button
        onClick={close}
        aria-label="Cerrar notificación"
        className="shrink-0 flex items-center justify-center w-7 h-7 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

function ToastAnimations() {
  return (
    <style>{`
      @keyframes toast-in {
        from { opacity: 0; transform: translateX(16px) scale(0.98); }
        to { opacity: 1; transform: translateX(0) scale(1); }
      }
      @keyframes toast-out {
        from { opacity: 1; transform: translateX(0) scale(1); }
        to { opacity: 0; transform: translateX(16px) scale(0.98); }
      }
      .animate-toast-in { animation: toast-in 220ms cubic-bezier(0.16, 1, 0.3, 1); }
      .animate-toast-out { animation: toast-out 180ms ease-in forwards; }
      @media (prefers-reduced-motion: reduce) {
        .animate-toast-in, .animate-toast-out { animation: none; }
      }
    `}</style>
  )
}
