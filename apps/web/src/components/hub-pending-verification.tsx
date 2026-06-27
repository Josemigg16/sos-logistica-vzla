import { Phone, ShieldAlert, MapPin, CheckCircle2, Loader2 } from "lucide-react"
import {
  toWhatsappNumber,
  useSupportContact,
} from "@/lib/settings/use-support-contact"

interface HubPendingVerificationProps {
  /** Nombre del centro recién registrado o en edición. Opcional. */
  hubName?: string
  /** Si true, usa el tono "centro ya registrado, ahora hay que verificarlo". */
  variant?: "post-register" | "edit-locked"
}

export function HubPendingVerification({
  hubName,
  variant = "edit-locked",
}: HubPendingVerificationProps) {
  const isPostRegister = variant === "post-register"

  const title = isPostRegister
    ? "¡Centro registrado!"
    : "Centro pendiente de verificación"

  const subtitle = isPostRegister
    ? "Tu centro de acopio quedó guardado y está pendiente de verificación por un coordinador de SOS Logística."
    : "Este centro de acopio está inactivo y necesita ser verificado por un coordinador de SOS Logística antes de poder operar."

  const cta = isPostRegister
    ? "Para activarlo y que aparezca en el mapa público, comunícate con nuestro equipo:"
    : "No puedes activar el centro por tu cuenta. Para verificarlo, comunícate con nuestro equipo:"

  return (
    <div className="rounded-2xl border border-amber-400/30 bg-amber-400/5 backdrop-blur-sm p-6 sm:p-8 flex flex-col items-center text-center max-w-xl mx-auto">
      <div
        className={`flex items-center justify-center w-14 h-14 rounded-2xl mb-4 ${
          isPostRegister
            ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
            : "bg-amber-400/15 text-amber-300 border border-amber-400/30"
        }`}
      >
        {isPostRegister ? (
          <CheckCircle2 className="w-7 h-7" />
        ) : (
          <ShieldAlert className="w-7 h-7" />
        )}
      </div>

      <h2
        className="text-white text-2xl sm:text-3xl mb-2 leading-tight"
        style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontStyle: "italic",
          fontWeight: 800,
          letterSpacing: "0.01em",
        }}
      >
        {title.toUpperCase()}
      </h2>

      {hubName && (
        <p className="text-sm text-white/70 font-semibold mb-1">
          <MapPin className="inline w-3.5 h-3.5 mr-1 -mt-0.5 text-white/50" />
          {hubName}
        </p>
      )}

      <p className="text-sm text-white/60 max-w-md leading-relaxed mt-1">
        {subtitle}
      </p>

      <div className="w-full mt-6 pt-5 border-t border-white/10 flex flex-col items-center gap-3">
        <p className="text-xs text-white/50 leading-relaxed max-w-sm">
          {cta}
        </p>

        <SupportContactBlock />

        <p className="text-[10.5px] text-white/40 leading-relaxed max-w-sm mt-1">
          Una vez verificado por nuestro equipo, el centro quedará activo y
          visible en el mapa público.
        </p>
      </div>
    </div>
  )
}

/**
 * Bloque reutilizable con el número de soporte. Lee el número desde el endpoint
 * `/settings/support-phone` (configurable por admin desde el panel). Si todavía
 * no fue configurado, mostramos un placeholder en lugar de un link roto.
 */
export function SupportContactBlock() {
  const { data, isLoading, isError } = useSupportContact()

  if (isLoading) {
    return (
      <div className="w-full max-w-sm rounded-xl border border-dashed border-white/15 bg-white/5 px-4 py-3 text-center flex items-center justify-center gap-2 text-white/40 text-xs">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        Cargando contacto…
      </div>
    )
  }

  const phone = data?.phone?.trim() ?? ""

  if (!phone || isError) {
    return (
      <div className="w-full max-w-sm rounded-xl border border-dashed border-white/15 bg-white/5 px-4 py-3 text-center">
        <Phone className="w-4 h-4 inline-block mr-1.5 -mt-0.5 text-white/40" />
        <span className="text-xs text-white/50 italic">
          Número de contacto pendiente de configuración
        </span>
      </div>
    )
  }

  const waLink = `https://wa.me/${toWhatsappNumber(phone)}?text=${encodeURIComponent(
    "Hola, quiero verificar mi centro de acopio registrado en SOS Logística.",
  )}`

  return (
    <a
      href={waLink}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-center justify-center gap-2.5 px-5 py-3 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-200 hover:text-emerald-100 transition-colors duration-200 active:scale-[0.97]"
    >
      <Phone className="w-4 h-4 group-hover:scale-110 transition-transform duration-200" />
      <span
        className="font-bold tracking-wide text-sm sm:text-base tabular-nums"
        style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}
      >
        {phone}
      </span>
    </a>
  )
}
