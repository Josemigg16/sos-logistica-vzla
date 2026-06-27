import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Package, Search } from 'lucide-react'
import { useScrollLock } from '@/lib/scroll-lock'

const PACKAGING_RULES_IMAGE = '/reglas_de_embalage.png'

export function PackagingRulesButton() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <style>{`
        @keyframes pkg-border-glow {
          0%, 100% { border-color: rgba(59, 130, 246, 0.4); box-shadow: 0 0 8px rgba(59, 130, 246, 0.15); }
          50% { border-color: rgba(59, 130, 246, 0.8); box-shadow: 0 0 16px rgba(59, 130, 246, 0.35); }
        }
        @keyframes pkg-pulse-scale {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.02); }
        }
        .pkg-animate-border-glow { animation: pkg-border-glow 2s infinite ease-in-out; }
        .pkg-animate-pulse-scale { animation: pkg-pulse-scale 2.5s infinite ease-in-out; }
        @media (prefers-reduced-motion: reduce) {
          .pkg-animate-border-glow, .pkg-animate-pulse-scale { animation: none; }
        }
      `}</style>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full relative flex items-center justify-between p-3.5 rounded-2xl border bg-gradient-to-r from-blue-600/10 to-blue-500/5 hover:from-blue-600/20 hover:to-blue-500/10 text-blue-400 hover:text-blue-300 transition-all duration-300 active:scale-[0.98] cursor-pointer overflow-hidden group pkg-animate-border-glow pkg-animate-pulse-scale"
      >
        <span className="absolute -left-1 -top-1 w-3 h-3 rounded-full bg-blue-500 blur-sm animate-ping opacity-75" />
        <div className="flex items-center gap-2.5 z-10">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-blue-500/20 text-blue-400 group-hover:scale-110 transition-transform duration-300">
            <Package className="w-5 h-5 animate-bounce" />
          </div>
          <div className="text-left">
            <p className="text-sm leading-tight font-extrabold tracking-wide text-white group-hover:text-blue-300 transition-colors">
              📦 REGLAS DE EMBALAJE
            </p>
            <p className="text-[11px] text-white/50 font-normal mt-0.5">
              Guía oficial para preparar la carga
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 z-10 bg-blue-500/20 text-blue-400 px-2.5 py-1 rounded-md text-[10px] font-black border border-blue-500/30 group-hover:bg-blue-500 group-hover:text-white transition-colors duration-300">
          VER
        </div>
      </button>

      {open && <PackagingRulesLightbox onClose={() => setOpen(false)} />}
    </>
  )
}

function PackagingRulesLightbox({ onClose }: { onClose: () => void }) {
  useScrollLock(true)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return createPortal(
    <div
      onClick={onClose}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-md cursor-zoom-out animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-label="Reglas de embalaje"
    >
      <div className="relative max-w-[90vw] max-h-[85vh] md:max-w-4xl flex flex-col items-center animate-in zoom-in-95 duration-300">
        <button
          type="button"
          onClick={onClose}
          className="absolute -top-12 right-0 text-white hover:text-gray-300 font-semibold text-xs bg-white/10 hover:bg-white/20 px-3.5 py-1.5 rounded-lg border border-white/10 active:scale-95 transition-[transform,background-color] duration-200 cursor-pointer flex items-center gap-1.5"
        >
          <Search className="w-3 h-3" />
          Cerrar (Esc)
        </button>
        <img
          src={PACKAGING_RULES_IMAGE}
          alt="Reglas de embalaje"
          className="w-full h-full object-contain rounded-2xl shadow-2xl border border-white/10 cursor-default"
          onClick={(e) => e.stopPropagation()}
        />
      </div>
    </div>,
    document.body,
  )
}
