import { createFileRoute, Link, Navigate, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { loginSchema } from "@sos/shared";
import { ArrowLeft, Eye, EyeOff, Loader2, Lock, LogIn, User } from "lucide-react";
import { AuthError } from "@/lib/auth/auth-client";
import { useAuth } from "@/lib/auth/auth-context";

import logotipo from "@/assets/branding/white-logotipo.webp";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

const EASE_OUT = "cubic-bezier(0.23, 1, 0.32, 1)";

interface FieldErrors {
  username?: string;
  password?: string;
}

function LoginPage() {
  const { status, login } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    document.documentElement.classList.add("dark");
    const t = setTimeout(() => setMounted(true), 60);
    return () => clearTimeout(t);
  }, []);

  // Ya hay sesión → directo al portal.
  if (status === "authenticated") return <Navigate to="/admin" />;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    setFieldErrors({});

    const parsed = loginSchema.safeParse({ username, password });
    if (!parsed.success) {
      const flat = parsed.error.flatten().fieldErrors;
      setFieldErrors({
        username: flat.username?.[0],
        password: flat.password?.[0],
      });
      return;
    }

    setSubmitting(true);
    try {
      await login(parsed.data);
      navigate({ to: "/admin" });
    } catch (err) {
      setFormError(
        err instanceof AuthError ? err.message : "Ocurrió un error. Intenta de nuevo.",
      );
      setSubmitting(false);
    }
  }

  return (
    <div
      className="relative flex min-h-dvh w-full items-center justify-center overflow-hidden px-4 py-10"
      style={{ background: "linear-gradient(160deg, #152D46 0%, #0F2337 50%, #0A1B2A 100%)" }}
    >
      {/* Grid pattern */}
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

      <div
        className="relative z-10 w-full max-w-md"
        style={{
          opacity: mounted ? 1 : 0,
          transform: mounted ? "translateY(0)" : "translateY(12px)",
          transition: `opacity 320ms ${EASE_OUT}, transform 320ms ${EASE_OUT}`,
        }}
      >
        <Link
          to="/"
          className="mb-5 inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-white/50 transition-colors duration-150 hover:text-white/80"
        >
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2.5} />
          <span>Volver al inicio</span>
        </Link>

        {/* Brand */}
        <div className="mb-8 flex flex-col items-center text-center">
          <img
            src={logotipo}
            alt="Portuguesa Unida"
            className="h-16 w-auto object-contain"
            style={{ filter: "drop-shadow(0 2px 12px rgba(43,95,142,0.5))" }}
          />
        </div>

        {/* Card */}
        <form
          onSubmit={handleSubmit}
          noValidate
          className="rounded-2xl border border-[#2B5F8E]/40 bg-[#152D46]/80 p-6 shadow-[0_8px_40px_rgba(15,35,55,0.6)] backdrop-blur-sm sm:p-7"
        >
          {/* Error banner */}
          {formError && (
            <div
              role="alert"
              className="mb-5 rounded-lg border border-[#4A89C0]/40 bg-[#2B5F8E]/25 px-4 py-3 text-sm text-[#C8DCF0]"
              style={{
                animation: `loginShake 360ms ${EASE_OUT}`,
              }}
            >
              {formError}
            </div>
          )}

          <Field
            id="username"
            label="Usuario"
            icon={<User className="h-4 w-4" />}
            value={username}
            onChange={setUsername}
            autoComplete="username"
            placeholder="tu.usuario"
            error={fieldErrors.username}
            disabled={submitting}
          />

          <Field
            id="password"
            label="Contraseña"
            icon={<Lock className="h-4 w-4" />}
            value={password}
            onChange={setPassword}
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="••••••••"
            error={fieldErrors.password}
            disabled={submitting}
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

          <button
            type="submit"
            disabled={submitting}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-white px-6 py-3 font-bold uppercase tracking-wide text-[#0F2337] shadow-[0_8px_32px_rgba(255,255,255,0.12)] transition-[transform,box-shadow,background-color] duration-150 hover:bg-[#C8DCF0] hover:shadow-[0_12px_40px_rgba(200,220,240,0.25)] active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-70 disabled:active:scale-100"
            style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontStyle: "italic",
              fontSize: "1.05rem",
              letterSpacing: "0.05em",
              transitionTimingFunction: EASE_OUT,
            }}
          >
            {submitting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" strokeWidth={2.5} />
                <span>Ingresando…</span>
              </>
            ) : (
              <>
                <LogIn className="h-5 w-5" strokeWidth={2.5} />
                <span>Ingresar</span>
              </>
            )}
          </button>

          <div className="mt-6 flex items-center gap-3">
            <span className="h-px flex-1 bg-[#2B5F8E]/30" />
            <span className="text-[10px] uppercase tracking-wider text-white/35">o</span>
            <span className="h-px flex-1 bg-[#2B5F8E]/30" />
          </div>

          <Link
            to="/register"
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-[#4A89C0]/50 bg-transparent px-6 py-3 font-bold uppercase tracking-wide text-[#C8DCF0] transition-[transform,background-color,border-color] duration-150 hover:border-[#4A89C0] hover:bg-[#2B5F8E]/25 active:scale-[0.97]"
            style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontStyle: "italic",
              fontSize: "1.05rem",
              letterSpacing: "0.05em",
              transitionTimingFunction: EASE_OUT,
            }}
          >
            <User className="h-5 w-5" strokeWidth={2.5} />
            <span>Crear cuenta</span>
          </Link>
        </form>

        <p className="mt-6 text-center text-[11px] leading-relaxed text-white/30">
          ¿Aún no estás registrado? Pulsa "Crear cuenta" para comenzar.
        </p>
      </div>

      <style>{`
        @keyframes loginShake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
        @media (prefers-reduced-motion: reduce) {
          [style*="loginShake"] { animation: none !important; }
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
  trailing?: React.ReactNode;
}

function Field({
  id,
  label,
  icon,
  value,
  onChange,
  type = "text",
  autoComplete,
  placeholder,
  error,
  disabled,
  trailing,
}: FieldProps) {
  return (
    <div className="mb-5">
      <label
        htmlFor={id}
        className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-white/50"
      >
        {label}
      </label>
      <div className="relative">
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/35">
          {icon}
        </span>
        <input
          id={id}
          name={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          placeholder={placeholder}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className={`w-full rounded-xl border bg-[#0F2337]/70 py-3 pl-11 ${
            trailing ? "pr-11" : "pr-4"
          } text-sm text-white placeholder:text-white/25 transition-[border-color,box-shadow] duration-150 outline-none focus:border-[#4A89C0] focus:ring-2 focus:ring-[#4A89C0]/30 disabled:opacity-60 ${
            error ? "border-[#C8DCF0]/50" : "border-[#2B5F8E]/40"
          }`}
        />
        {trailing && (
          <span className="absolute right-3.5 top-1/2 -translate-y-1/2">{trailing}</span>
        )}
      </div>
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-[11px] text-[#C8DCF0]">
          {error}
        </p>
      )}
    </div>
  );
}
