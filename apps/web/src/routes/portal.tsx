import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import type { RoleName } from "@sos/shared";
import { LogOut, ShieldCheck } from "lucide-react";
import { useAuth } from "@/lib/auth/auth-context";
import { RequireAuth } from "@/lib/auth/require-auth";

import logotipo from "@/assets/branding/white-logotipo.webp";

export const Route = createFileRoute("/portal")({
  component: () => (
    <RequireAuth>
      <PortalHome />
    </RequireAuth>
  ),
});

const ROLE_LABELS: Record<RoleName, string> = {
  ADMIN: "Administrador",
  MANAGER: "Coordinador general",
  ZODI_SENDER: "ZODI origen",
  ZODI_DESTINATION: "ZODI destino",
  HUB_COORDINATOR: "Coordinador de centro de acopio",
  DRIVER: "Conductor",
  VOLUNTEER: "Voluntario",
};

function PortalHome() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    await logout();
    navigate({ to: "/login" });
  }

  return (
    <div
      className="min-h-dvh w-full overflow-x-hidden"
      style={{ background: "linear-gradient(160deg, #152D46 0%, #0F2337 50%, #0A1B2A 100%)" }}
    >
      <div className="relative z-10 mx-auto max-w-3xl px-4 py-8 md:px-8 md:py-12">
        <header className="mb-10 flex items-center justify-between">
          <img
            src={logotipo}
            alt="Portuguesa Unida"
            className="h-12 w-auto object-contain"
            style={{ filter: "drop-shadow(0 2px 12px rgba(43,95,142,0.5))" }}
          />
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex items-center gap-2 rounded-lg border border-[#2B5F8E]/40 bg-[#152D46]/70 px-4 py-2 text-xs font-semibold text-white/70 transition-[transform,background-color,color] duration-150 hover:bg-[#2B5F8E]/30 hover:text-white active:scale-[0.97] disabled:opacity-60"
            style={{ transitionTimingFunction: "cubic-bezier(0.23, 1, 0.32, 1)" }}
          >
            <LogOut className="h-4 w-4" />
            <span>{loggingOut ? "Saliendo…" : "Cerrar sesión"}</span>
          </button>
        </header>

        <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-[#4A89C0]/30 bg-[#2B5F8E]/40 px-3 py-1.5">
          <ShieldCheck className="h-3 w-3 text-[#C8DCF0]" />
          <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#C8DCF0]">
            {user ? ROLE_LABELS[user.role] : "Portal"}
          </span>
        </div>

        <h1
          className="leading-[0.95] tracking-tight text-white"
          style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontStyle: "italic",
            fontWeight: 800,
            fontSize: "clamp(2.2rem, 6vw, 3.4rem)",
          }}
        >
          HOLA,{" "}
          <span style={{ color: "#C8DCF0" }}>{user?.username ?? "coordinador"}</span>
        </h1>
        <p className="mt-3 max-w-lg text-sm leading-relaxed text-white/50">
          Estás dentro del portal de coordinación. Desde acá vas a gestionar centros de
          acopio, recursos y operaciones de respuesta.
        </p>
      </div>
    </div>
  );
}
