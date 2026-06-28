import { Phone, ShieldAlert, MapPin, CheckCircle2, Loader2 } from "lucide-react"
import {
  toWhatsappNumber,
  useSupportContact,
} from "@/lib/settings/use-support-contact"

interface HubPendingVerificationProps {
  /** Nombre del centro recién registrado o en edición. Opcional. */
  hubName?: string
  /**
   * `post-register` / `edit-locked` — bloque grande centrado (modal o standalone).
   * `inline` — banner compacto horizontal para insertar arriba del dashboard de un hub.
   */
  variant?: "post-register" | "edit-locked" | "inline"
}

export function HubPendingVerification({
  hubName,
  variant = "edit-locked",
}: HubPendingVerificationProps) {
  if (variant === "inline") {
    return <HubPendingVerificationInline hubName={hubName} />
  }

  const isPostRegister = variant === "post-register"

  const title = isPostRegister
    ? "¡Centro registrado!"
    : "Centro pendiente de verificación"

  const subtitle = isPostRegister
    ? "Tu centro de acopio quedó guardado y está pendiente de verificación por un coordinador de Portuguesa Unida."
    : "Este centro de acopio está inactivo y necesita ser verificado por un coordinador de Portuguesa Unida antes de poder operar."

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
 * Banner compacto horizontal para insertar arriba del dashboard de un hub
 * inactivo cuando el coordinador entra a verlo. No interrumpe el flujo de la
 * vista — solo recuerda el estado y muestra el contacto de soporte.
 */
function HubPendingVerificationInline({ hubName }: { hubName?: string }) {
  const { data } = useSupportContact()
  const phone = data?.phone?.trim() ?? ""
  const waLink = phone
    ? `https://wa.me/${toWhatsappNumber(phone)}?text=${encodeURIComponent("Hola, quiero verificar mi centro de acopio registrado en Portuguesa Unida.")}`
    : null

  return (
    <div className="flex items-start gap-3 rounded-xl border border-amber-400/30 bg-amber-400/5 px-4 py-3">
      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-400/15 border border-amber-400/30 text-amber-300 shrink-0">
        <ShieldAlert className="w-4 h-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold text-amber-100 leading-snug">
          Centro pendiente de verificación
        </p>
        <p className="text-[11px] text-amber-200/70 leading-relaxed mt-0.5">
          {hubName ? <><span className="font-semibold">{hubName}</span> está </> : 'Está '}
          inactivo hasta que el equipo de Portuguesa Unida lo verifique. Mientras tanto no aparece en el mapa público.
        </p>
      </div>
      {waLink && phone && (
        <a
          href={waLink}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-200 hover:text-emerald-100 text-[11px] font-semibold tracking-wide transition-colors active:scale-[0.97]"
          title={`Contactar soporte: ${phone}`}
        >
          <Phone className="w-3.5 h-3.5" />
          <span className="hidden sm:inline tabular-nums">{phone}</span>
          <span className="sm:hidden">Soporte</span>
        </a>
      )}
    </div>
  )
}

interface SupportContactBlockProps {
  /** Mensaje pre-rellenado en WhatsApp. */
  message?: string
}

/**
 * Bloque reutilizable con el número de soporte. Lee el número desde el endpoint
 * `/settings/support-phone` (configurable por admin desde el panel). Si todavía
 * no fue configurado, mostramos un placeholder en lugar de un link roto.
 */
export function SupportContactBlock({
  message = "Hola, quiero verificar mi centro de acopio registrado en Portuguesa Unida.",
}: SupportContactBlockProps = {}) {
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

  const waLink = `https://wa.me/${toWhatsappNumber(phone)}?text=${encodeURIComponent(message)}`

  return (
    <a
      href={waLink}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-center justify-center gap-2.5 px-5 py-3 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-200 hover:text-emerald-100 transition-colors duration-200 active:scale-[0.97]"
    >
      <svg className="w-4 h-4 group-hover:scale-110 transition-transform duration-200 fill-current" viewBox="0 0 24 24">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.458 5.704 1.459h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
      </svg>
      <span
        className="font-bold tracking-wide text-sm sm:text-base tabular-nums"
        style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}
      >
        {phone}
      </span>
    </a>
  )
}
