import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { ConfirmDialog } from './confirm-dialog'

/**
 * Shell reutilizable para modales con formulario. Tres zonas fijas:
 * header (arriba) · body scrolleable (medio) · footer sticky (abajo).
 * El footer NUNCA se va con el scroll del contenido.
 *
 * Incluye guard de cambios sin guardar: si `isDirty` y el usuario intenta
 * cerrar (X, backdrop, Escape o un botón Cancelar que llame `requestClose`),
 * primero muestra un ConfirmDialog "¿Salir sin guardar?".
 *
 * En mobile se comporta como bottom sheet (pegado abajo); en desktop, modal
 * centrado.
 */

const SIZE_CLASS = {
  md: 'sm:max-w-md',
  lg: 'sm:max-w-lg',
  xl: 'sm:max-w-2xl',
} as const

export interface FormSheetProps {
  title: string
  /** Hay cambios sin guardar → activa el guard al cerrar. */
  isDirty: boolean
  isSubmitting?: boolean
  /** Cierre real (limpio o ya confirmado). El padre normalmente desmonta acá. */
  onClose: () => void
  /** Si se provee, el FormSheet renderiza el <form> y el footer queda dentro. */
  onSubmit?: (e: React.FormEvent) => void
  /**
   * Contenido del footer sticky (botones Cancelar / Guardar). Puede ser un
   * render-prop que recibe `requestClose` para que el botón Cancelar dispare
   * el mismo guard de cambios sin guardar que la X y el backdrop.
   */
  footer: React.ReactNode | ((requestClose: () => void) => React.ReactNode)
  /** Cuerpo scrolleable. */
  children: React.ReactNode
  size?: keyof typeof SIZE_CLASS
  leaveConfirm?: {
    title?: string
    description?: React.ReactNode
    confirmLabel?: string
    cancelLabel?: string
  }
}

export function FormSheet({
  title,
  isDirty,
  isSubmitting = false,
  onClose,
  onSubmit,
  footer,
  children,
  size = 'xl',
  leaveConfirm,
}: FormSheetProps) {
  const [confirmLeave, setConfirmLeave] = useState(false)
  const confirmLeaveRef = useRef(confirmLeave)
  confirmLeaveRef.current = confirmLeave

  /** Intenta cerrar; si hay cambios sin guardar, pide confirmación primero. */
  const requestClose = useCallback(() => {
    if (isSubmitting) return
    if (isDirty) {
      setConfirmLeave(true)
      return
    }
    onClose()
  }, [isDirty, isSubmitting, onClose])

  // Bloquea scroll del body + cierra con Escape (salvo que el confirm esté abierto).
  useEffect(() => {
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !confirmLeaveRef.current) requestClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', onKey)
    }
  }, [requestClose])

  const panel = (
    <div
      className={`relative w-full ${SIZE_CLASS[size]} bg-[#0F2337] border border-[#2B5F8E]/50 rounded-t-2xl sm:rounded-2xl shadow-[0_24px_60px_-20px_rgba(0,0,0,0.7)] flex flex-col max-h-[92dvh] overflow-hidden animate-sheet-panel`}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header — fijo arriba */}
      <div className="shrink-0 flex items-center justify-between p-5 border-b border-[#2B5F8E]/30">
        <h2
          className="text-white pr-2"
          style={{ fontFamily: "'Barlow Condensed', sans-serif", fontStyle: 'italic', fontWeight: 700, fontSize: '1.4rem' }}
        >
          {title.toUpperCase()}
        </h2>
        <button
          type="button"
          onClick={requestClose}
          disabled={isSubmitting}
          className="flex items-center justify-center w-8 h-8 rounded-lg text-white/50 hover:text-white hover:bg-white/10 active:scale-[0.96] disabled:opacity-30 transition-[transform,background-color,color] duration-200 cursor-pointer"
          aria-label="Cerrar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Body — única zona scrolleable */}
      <div className="flex-1 min-h-0 overflow-y-auto p-5">{children}</div>

      {/* Footer — fijo abajo, nunca scrollea */}
      <div className="shrink-0 p-5 border-t border-[#2B5F8E]/30 bg-[#0F2337]">
        {typeof footer === 'function' ? footer(requestClose) : footer}
      </div>
    </div>
  )

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm animate-sheet-overlay"
        onClick={requestClose}
        role="dialog"
        aria-modal="true"
      >
        {onSubmit ? (
          <form onSubmit={onSubmit} className="contents">
            {panel}
          </form>
        ) : (
          panel
        )}
      </div>

      <ConfirmDialog
        open={confirmLeave}
        tone="warning"
        title={leaveConfirm?.title ?? '¿Salir sin guardar?'}
        description={
          leaveConfirm?.description ??
          'Tenés cambios sin guardar. Si salís ahora, se perderán.'
        }
        confirmLabel={leaveConfirm?.confirmLabel ?? 'Salir sin guardar'}
        cancelLabel={leaveConfirm?.cancelLabel ?? 'Seguir editando'}
        onConfirm={() => {
          setConfirmLeave(false)
          onClose()
        }}
        onCancel={() => setConfirmLeave(false)}
      />

      <FormSheetAnimations />
    </>,
    document.body,
  )
}

function FormSheetAnimations() {
  return (
    <style>{`
      @keyframes sheet-overlay-in { from { opacity: 0 } to { opacity: 1 } }
      @keyframes sheet-panel-in { from { opacity: 0; transform: translateY(8px) scale(0.97) } to { opacity: 1; transform: translateY(0) scale(1) } }
      .animate-sheet-overlay { animation: sheet-overlay-in 160ms ease-out }
      .animate-sheet-panel { animation: sheet-panel-in 220ms cubic-bezier(0.16, 1, 0.3, 1) }
      @media (max-width: 639px) {
        @keyframes sheet-panel-in-mobile { from { opacity: 0; transform: translateY(40px) } to { opacity: 1; transform: translateY(0) } }
        .animate-sheet-panel { animation: sheet-panel-in-mobile 260ms cubic-bezier(0.16, 1, 0.3, 1) }
      }
      @media (prefers-reduced-motion: reduce) {
        .animate-sheet-overlay, .animate-sheet-panel { animation: none }
      }
    `}</style>
  )
}
