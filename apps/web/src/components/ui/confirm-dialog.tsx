import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { AlertTriangle, Loader2, X } from 'lucide-react'

export type ConfirmDialogTone = 'danger' | 'warning' | 'default'

export interface ConfirmDialogProps {
  open: boolean
  title: string
  description?: React.ReactNode
  confirmLabel?: string
  cancelLabel?: string
  tone?: ConfirmDialogTone
  isPending?: boolean
  onConfirm: () => void
  onCancel: () => void
}

const TONE_STYLES: Record<ConfirmDialogTone, {
  iconWrap: string
  iconColor: string
  border: string
  confirmBtn: string
}> = {
  danger: {
    iconWrap: 'bg-red-500/15 border border-red-500/30',
    iconColor: 'text-red-300',
    border: 'border-red-500/35',
    confirmBtn: 'bg-red-500 hover:bg-red-400 disabled:bg-red-500/40 text-white',
  },
  warning: {
    iconWrap: 'bg-amber-400/15 border border-amber-400/30',
    iconColor: 'text-amber-300',
    border: 'border-amber-400/35',
    confirmBtn: 'bg-amber-500 hover:bg-amber-400 disabled:bg-amber-500/40 text-[#0F2337]',
  },
  default: {
    iconWrap: 'bg-[#2B5F8E]/30 border border-[#4A89C0]/40',
    iconColor: 'text-[#C8DCF0]',
    border: 'border-[#2B5F8E]/50',
    confirmBtn: 'bg-white hover:bg-[#C8DCF0] disabled:bg-white/40 text-[#0F2337]',
  },
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  tone = 'default',
  isPending = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isPending) onCancel()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onCancel, isPending])

  if (!open) return null
  const cfg = TONE_STYLES[tone]

  return createPortal(
    <div
      className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center bg-[#0A1A2A]/80 backdrop-blur-md p-0 sm:p-4 animate-confirm-overlay"
      onClick={() => { if (!isPending) onCancel() }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      <div
        className={`relative w-full sm:max-w-md bg-[#0F2337] border ${cfg.border} rounded-t-2xl sm:rounded-2xl shadow-[0_24px_60px_-20px_rgba(0,0,0,0.7)] animate-confirm-panel overflow-hidden`}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onCancel}
          disabled={isPending}
          aria-label="Cerrar"
          className="absolute top-3 right-3 flex items-center justify-center w-8 h-8 rounded-lg text-white/40 hover:text-white hover:bg-white/10 disabled:opacity-30 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="p-6 pt-7">
          <div className={`flex items-center justify-center w-12 h-12 rounded-xl mb-4 ${cfg.iconWrap} ${cfg.iconColor}`}>
            <AlertTriangle className="w-6 h-6" />
          </div>

          <h3
            id="confirm-dialog-title"
            className="text-white mb-2"
            style={{ fontFamily: "'Barlow Condensed', sans-serif", fontStyle: 'italic', fontWeight: 700, fontSize: '1.4rem', letterSpacing: '0.01em' }}
          >
            {title.toUpperCase()}
          </h3>

          {description && (
            <div className="text-sm text-white/65 leading-relaxed">{description}</div>
          )}

          <div className="flex flex-col sm:flex-row gap-2 mt-6 pt-5 border-t border-white/10">
            <button
              type="button"
              onClick={onCancel}
              disabled={isPending}
              className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/75 text-sm font-semibold hover:bg-white/10 hover:text-white active:scale-[0.98] transition-[transform,background-color,color] duration-200 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isPending}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold active:scale-[0.98] transition-[transform,background-color] duration-200 disabled:cursor-not-allowed cursor-pointer ${cfg.confirmBtn}`}
            >
              {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>

      <ConfirmAnimations />
    </div>,
    document.body,
  )
}

function ConfirmAnimations() {
  return (
    <style>{`
      @keyframes confirm-overlay-in {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes confirm-panel-in {
        from { opacity: 0; transform: translateY(12px) scale(0.97); }
        to { opacity: 1; transform: translateY(0) scale(1); }
      }
      .animate-confirm-overlay { animation: confirm-overlay-in 160ms ease-out; }
      .animate-confirm-panel { animation: confirm-panel-in 220ms cubic-bezier(0.16, 1, 0.3, 1); }
      @media (max-width: 639px) {
        @keyframes confirm-panel-in-mobile {
          from { opacity: 0; transform: translateY(40px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-confirm-panel { animation: confirm-panel-in-mobile 260ms cubic-bezier(0.16, 1, 0.3, 1); }
      }
      @media (prefers-reduced-motion: reduce) {
        .animate-confirm-overlay, .animate-confirm-panel { animation: none; }
      }
    `}</style>
  )
}
