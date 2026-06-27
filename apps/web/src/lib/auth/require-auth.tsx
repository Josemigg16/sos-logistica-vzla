import type { ReactNode } from "react";
import { Navigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useAuth } from "./auth-context";

/**
 * Envuelve rutas privadas del portal. Mientras se restaura la sesión muestra un
 * splash; si no hay sesión, redirige a /login. No contiene lógica de negocio.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { status } = useAuth();

  if (status === "loading") return <AuthSplash />;
  if (status === "unauthenticated") return <Navigate to="/login" />;
  return <>{children}</>;
}

function AuthSplash() {
  return (
    <div
      className="flex min-h-dvh w-full items-center justify-center"
      style={{ background: "linear-gradient(160deg, #152D46 0%, #0F2337 50%, #0A1B2A 100%)" }}
    >
      <Loader2 className="h-7 w-7 animate-spin text-[#4A89C0]" strokeWidth={2.5} />
    </div>
  );
}
