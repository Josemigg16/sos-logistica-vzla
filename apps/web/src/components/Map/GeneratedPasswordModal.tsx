import { useState, useEffect } from "react";
import { CheckCircle2, Phone, Lock, Copy } from "lucide-react";

interface GeneratedPasswordModalProps {
  telefono: string;
  password: string;
  onClose: () => void;
}

export function GeneratedPasswordModal({ telefono, password, onClose }: GeneratedPasswordModalProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  async function copyPassword() {
    await navigator.clipboard.writeText(password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-[#0A1A2A]/80 backdrop-blur-md p-4 animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative w-full max-w-md animate-in zoom-in-95 duration-300 rounded-2xl bg-[#0F2337]/95 border border-[#2B5F8E]/50 shadow-[0_20px_60px_rgba(0,0,0,0.6)] p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex flex-col items-center text-center">
          <CheckCircle2 className="mb-3 h-12 w-12 text-emerald-400" strokeWidth={1.5} />
          <h2 className="text-xl font-bold text-white">¡Centro registrado!</h2>
          <p className="mt-1 text-sm text-white/60">
            Se creó tu cuenta de coordinador. Guarda esta contraseña — solo se muestra una vez.
          </p>
        </div>

        <div className="mb-4 space-y-2">
          <div className="flex items-center gap-2 rounded-xl border border-[#2B5F8E]/40 bg-[#152D46]/60 px-4 py-2.5">
            <Phone className="h-4 w-4 shrink-0 text-white/40" />
            <span className="flex-1 text-sm font-medium text-white/80">Teléfono (usuario)</span>
            <span className="font-mono text-sm text-white">{telefono}</span>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-[#2B5F8E]/40 bg-[#152D46]/60 px-4 py-2.5">
            <Lock className="h-4 w-4 shrink-0 text-white/40" />
            <span className="flex-1 text-sm font-medium text-white/80">Contraseña</span>
            <span className="font-mono text-base font-bold tracking-widest text-white uppercase">{password}</span>
            <button
              type="button"
              onClick={copyPassword}
              className="ml-1 text-white/40 transition-colors duration-150 hover:text-white/80"
              aria-label="Copiar contraseña"
            >
              {copied ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        <p className="mb-5 text-center text-[11px] text-white/40">
          Puedes cambiar tu contraseña desde el portal en cualquier momento.
        </p>

        <button
          onClick={onClose}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-white px-6 py-3 font-bold uppercase tracking-wide text-[#0F2337] transition-[transform,background-color] duration-150 hover:bg-[#C8DCF0] active:scale-[0.97]"
          style={{ fontFamily: "'Barlow Condensed', sans-serif", fontStyle: "italic", fontSize: "1.05rem", letterSpacing: "0.05em" }}
        >
          Ir al portal
        </button>
      </div>
    </div>
  );
}
