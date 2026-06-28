import { createFileRoute, Link, Navigate, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { ArrowLeft, Copy, CheckCircle2, CreditCard, Eye, EyeOff, Loader2, Lock, Phone } from "lucide-react";
import { signupSchema } from "@sos/shared";
import { useAuth } from "@/lib/auth/auth-context";
import { signupHub, AuthError } from "@/lib/auth/auth-client";

import logotipo from "@/assets/branding/white-logotipo.webp";

export const Route = createFileRoute("/register")({
  component: RegisterPage,
});

const EASE_OUT = "cubic-bezier(0.23, 1, 0.32, 1)";

function RegisterPage() {
  const { status, loginWithToken } = useAuth();
  const navigate = useNavigate();

  const [telefono, setTelefono] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [documentType, setDocumentType] = useState<"V" | "J">("V");
  const [cedula, setCedula] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | undefined>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [copied, setCopied] = useState(false);

  if (status === "authenticated") return <Navigate to="/admin" />;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    setFieldErrors({});

    const passwordUp = password.toUpperCase();
    if (passwordUp !== confirmPassword.toUpperCase()) {
      setFieldErrors({ confirmPassword: "Las contraseñas no coinciden" });
      return;
    }

    const cedulaTrim = cedula.trim();

    const parsed = signupSchema.safeParse({
      telefono,
      documentType: cedulaTrim ? documentType : undefined,
      cedula: cedulaTrim || undefined,
      password: passwordUp,
    });
    if (!parsed.success) {
      const flat = parsed.error.flatten().fieldErrors;
      setFieldErrors({
        telefono: flat.telefono?.[0],
        cedula: flat.cedula?.[0],
        password: flat.password?.[0],
      });
      return;
    }

    setSubmitting(true);
    try {
      const result = await signupHub(parsed.data.telefono, {
        password: parsed.data.password,
        documentType: parsed.data.documentType,
        cedula: parsed.data.cedula,
      });
      loginWithToken(result.accessToken, result.user);
      setRegistered(true);
    } catch (err) {
      if (err instanceof AuthError) {
        if (err.code === "USERNAME_TAKEN") {
          setFieldErrors({ telefono: err.message });
        } else if (err.code === "CEDULA_TAKEN") {
          setFieldErrors({ cedula: err.message });
        } else {
          setFormError(err.message);
        }
      } else {
        setFormError(err instanceof Error ? err.message : "Ocurrió un error. Intenta de nuevo.");
      }
      setSubmitting(false);
    }
  }

  async function copyPhone() {
    await navigator.clipboard.writeText(telefono);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div
      className="relative flex min-h-dvh w-full items-center justify-center overflow-hidden px-4 py-10"
      style={{ background: "linear-gradient(160deg, #152D46 0%, #0F2337 50%, #0A1B2A 100%)" }}
    >
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          backgroundImage: `
            linear-gradient(rgba(43,95,142,0.07) 1px, transparent 1px),
            linear-gradient(90deg, rgba(43,95,142,0.07) 1px, transparent 1px)
          `,
          backgroundSize: "48px 48px",
        }}
      />
      <div className="pointer-events-none fixed top-0 left-1/2 z-0 h-64 w-[800px] -translate-x-1/2 rounded-full bg-[#2B5F8E]/20 blur-[80px]" />

      <div className="relative z-10 w-full max-w-md">
        <Link
          to="/"
          className="mb-5 inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-white/50 transition-colors duration-150 hover:text-white/80"
        >
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2.5} />
          <span>Volver al inicio</span>
        </Link>

        <div className="mb-8 flex flex-col items-center text-center">
          <img
            src={logotipo}
            alt="Portuguesa Unida"
            className="h-16 w-auto object-contain"
            style={{ filter: "drop-shadow(0 2px 12px rgba(43,95,142,0.5))" }}
          />
        </div>

        {registered ? (
          <div className="rounded-2xl border border-[#2B5F8E]/40 bg-[#152D46]/80 p-8 shadow-[0_8px_40px_rgba(15,35,55,0.6)] backdrop-blur-sm text-center">
            <CheckCircle2 className="mx-auto mb-4 h-14 w-14 text-emerald-400" strokeWidth={1.5} />
            <h2 className="mb-2 text-xl font-bold text-white">¡Cuenta creada!</h2>
            <p className="mb-6 text-sm text-white/60">
              Tu usuario es tu número de teléfono:
            </p>

            <div className="mb-6 flex items-center gap-2 rounded-xl border border-[#4A89C0]/40 bg-[#0F2337]/70 px-4 py-3">
              <Phone className="h-4 w-4 shrink-0 text-white/40" />
              <span className="flex-1 font-mono text-lg font-bold tracking-widest text-white">
                {telefono}
              </span>
              <button
                type="button"
                onClick={copyPhone}
                className="text-white/40 transition-colors duration-150 hover:text-white/80"
                aria-label="Copiar teléfono"
              >
                {copied ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </button>
            </div>

            <button
              onClick={() => navigate({ to: "/admin" })}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-white px-6 py-3 font-bold uppercase tracking-wide text-[#0F2337] shadow-[0_8px_32px_rgba(255,255,255,0.12)] transition-[transform,box-shadow,background-color] duration-150 hover:bg-[#C8DCF0] hover:shadow-[0_12px_40px_rgba(200,220,240,0.25)]"
              style={{ fontFamily: "'Barlow Condensed', sans-serif", fontStyle: "italic", fontSize: "1.05rem", letterSpacing: "0.05em", transitionTimingFunction: EASE_OUT }}
            >
              Ir al portal
            </button>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            noValidate
            className="rounded-2xl border border-[#2B5F8E]/40 bg-[#152D46]/80 p-6 shadow-[0_8px_40px_rgba(15,35,55,0.6)] backdrop-blur-sm sm:p-7"
          >
            <h2 className="mb-5 text-center text-lg font-bold uppercase tracking-wide text-white/80"
              style={{ fontFamily: "'Barlow Condensed', sans-serif", fontStyle: "italic" }}>
              Registro de Coordinador
            </h2>

            {formError && (
              <div
                role="alert"
                className="mb-5 rounded-lg border border-[#4A89C0]/40 bg-[#2B5F8E]/25 px-4 py-3 text-sm text-[#C8DCF0]"
                style={{ animation: `loginShake 360ms ${EASE_OUT}` }}
              >
                {formError}
              </div>
            )}

            <Field id="telefono" label="Teléfono *" icon={<Phone className="h-4 w-4" />}
              value={telefono} onChange={setTelefono} type="tel" autoComplete="tel"
              placeholder="ej: +584141234567" error={fieldErrors.telefono} disabled={submitting} />

            <Field
              id="password"
              label="Contraseña *"
              icon={<Lock className="h-4 w-4" />}
              value={password}
              onChange={setPassword}
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Mínimo 5 caracteres"
              error={fieldErrors.password}
              disabled={submitting}
              uppercase
              trailing={
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  tabIndex={-1}
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  className="text-white/40 transition-colors duration-150 hover:text-white/70"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              }
            />

            <Field
              id="confirmPassword"
              label="Confirmar contraseña *"
              icon={<Lock className="h-4 w-4" />}
              value={confirmPassword}
              onChange={setConfirmPassword}
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Repite tu contraseña"
              error={fieldErrors.confirmPassword}
              disabled={submitting}
              uppercase
            />

            <DocumentField
              documentType={documentType}
              onDocumentTypeChange={setDocumentType}
              value={cedula}
              onChange={setCedula}
              error={fieldErrors.cedula}
              disabled={submitting}
            />

            <button
              type="submit"
              disabled={submitting}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-white px-6 py-3 font-bold uppercase tracking-wide text-[#0F2337] shadow-[0_8px_32px_rgba(255,255,255,0.12)] transition-[transform,box-shadow,background-color] duration-150 hover:bg-[#C8DCF0] hover:shadow-[0_12px_40px_rgba(200,220,240,0.25)] active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-70 disabled:active:scale-100"
              style={{ fontFamily: "'Barlow Condensed', sans-serif", fontStyle: "italic", fontSize: "1.05rem", letterSpacing: "0.05em", transitionTimingFunction: EASE_OUT }}
            >
              {submitting ? (
                <><Loader2 className="h-5 w-5 animate-spin" strokeWidth={2.5} /><span>Registrando…</span></>
              ) : (
                <span>Registrarme</span>
              )}
            </button>

            <p className="mt-5 text-center text-xs text-white/40">
              ¿Ya tienes cuenta?{" "}
              <Link to="/login" className="text-[#4A89C0] hover:underline">Iniciar sesión</Link>
            </p>
          </form>
        )}

        <p className="mt-6 text-center text-[11px] leading-relaxed text-white/30">
          Solo para coordinadores de centros de acopio.
        </p>
      </div>

      <style>{`
        @keyframes loginShake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
      `}</style>
    </div>
  );
}

interface FieldProps {
  id: string;
  label: string;
  icon: React.ReactNode;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  autoComplete?: string;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  uppercase?: boolean;
  trailing?: React.ReactNode;
}

function Field({ id, label, icon, value, onChange, type = "text", autoComplete, placeholder, error, disabled, uppercase, trailing }: FieldProps) {
  return (
    <div className="mb-5">
      <label htmlFor={id} className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-white/50">
        {label}
      </label>
      <div className="relative">
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/35">{icon}</span>
        <input
          id={id} name={id} type={type} value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete} placeholder={placeholder} disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          style={uppercase ? { textTransform: "uppercase" } : undefined}
          className={`w-full rounded-xl border bg-[#0F2337]/70 py-3 pl-11 ${trailing ? "pr-11" : "pr-4"} text-sm text-white placeholder:text-white/25 transition-[border-color,box-shadow] duration-150 outline-none focus:border-[#4A89C0] focus:ring-2 focus:ring-[#4A89C0]/30 disabled:opacity-60 ${error ? "border-[#C8DCF0]/50" : "border-[#2B5F8E]/40"}`}
        />
        {trailing && (
          <span className="absolute right-3.5 top-1/2 -translate-y-1/2">{trailing}</span>
        )}
      </div>
      {error && <p id={`${id}-error`} className="mt-1.5 text-[11px] text-[#C8DCF0]">{error}</p>}
    </div>
  );
}

interface DocumentFieldProps {
  documentType: "V" | "J";
  onDocumentTypeChange: (value: "V" | "J") => void;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
}

function DocumentField({ documentType, onDocumentTypeChange, value, onChange, error, disabled }: DocumentFieldProps) {
  return (
    <div className="mb-5">
      <label htmlFor="cedula" className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-white/50">
        Cédula / RIF <span className="text-white/30 normal-case font-normal">(opcional)</span>
      </label>
      <div className={`flex items-stretch rounded-xl border bg-[#0F2337]/70 transition-[border-color,box-shadow] duration-150 focus-within:border-[#4A89C0] focus-within:ring-2 focus-within:ring-[#4A89C0]/30 ${disabled ? "opacity-60" : ""} ${error ? "border-[#C8DCF0]/50" : "border-[#2B5F8E]/40"}`}>
        <div className="relative flex items-center">
          <select
            value={documentType}
            onChange={(e) => onDocumentTypeChange(e.target.value as "V" | "J")}
            disabled={disabled}
            aria-label="Tipo de documento"
            className="h-full appearance-none rounded-l-xl border-r border-[#2B5F8E]/40 bg-[#152D46]/60 py-3 pl-4 pr-7 text-sm font-semibold text-white outline-none disabled:cursor-not-allowed"
          >
            <option value="V">V</option>
            <option value="J">J</option>
          </select>
          <svg className="pointer-events-none absolute right-2 h-3 w-3 text-white/50" viewBox="0 0 12 8" fill="none">
            <path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <span className="pointer-events-none flex items-center pl-3 text-white/35">
          <CreditCard className="h-4 w-4" />
        </span>
        <input
          id="cedula" name="cedula" type="text" inputMode="numeric"
          value={value} onChange={(e) => onChange(e.target.value)}
          disabled={disabled} placeholder="ej: 12345678"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "cedula-error" : undefined}
          className="w-full rounded-r-xl bg-transparent py-3 pl-2.5 pr-4 text-sm text-white placeholder:text-white/25 outline-none disabled:cursor-not-allowed"
        />
      </div>
      {error && <p id="cedula-error" className="mt-1.5 text-[11px] text-[#C8DCF0]">{error}</p>}
    </div>
  );
}
