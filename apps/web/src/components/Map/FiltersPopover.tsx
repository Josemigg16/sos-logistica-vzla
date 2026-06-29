import { Eye, EyeOff } from "lucide-react";
import { CENTRO_TYPES, CENTRO_TYPE_UI } from "@/lib/map/mapViewerConstants";
import type { Centro } from "@/lib/map/mapViewerConstants";

interface FiltersPopoverProps {
  activeTipos: Set<Centro["tipo"]>;
  toggleTipo: (tipo: Centro["tipo"]) => void;
  activeConvoysLength: number;
  showSupplyRoute: boolean;
  userLocation: [number, number] | null;
  setActiveTipos: (tipos: Set<Centro["tipo"]>) => void;
}

export function FiltersPopover({
  activeTipos,
  toggleTipo,
  activeConvoysLength,
  showSupplyRoute,
  userLocation,
  setActiveTipos,
}: FiltersPopoverProps) {
  return (
    <div className="absolute bottom-20 right-4 z-40 p-3.5 rounded-2xl bg-card/95 border border-border shadow-2xl backdrop-blur-md flex flex-col gap-2.5 min-w-[240px] animate-in fade-in slide-in-from-bottom-2 duration-200">
      <div className="flex items-center justify-between border-b border-border/50 pb-2">
        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Filtrar centros</span>
        {activeTipos.size < CENTRO_TYPES.length && (
          <button
            onClick={() => setActiveTipos(new Set<Centro["tipo"]>(CENTRO_TYPES))}
            className="text-[9px] font-semibold text-blue-400 hover:text-blue-300 uppercase tracking-wider cursor-pointer transition-colors"
          >
            Ver todos
          </button>
        )}
      </div>
      <div className="flex flex-col gap-1">
        {CENTRO_TYPES.map((tipo) => {
          const { label, dot, glow } = CENTRO_TYPE_UI[tipo];
          const isActive = activeTipos.has(tipo);
          return (
            <button
              key={tipo}
              onClick={() => toggleTipo(tipo)}
              aria-pressed={isActive}
              title={isActive ? `Ocultar ${label}` : `Mostrar ${label}`}
              className={`group flex items-center gap-2.5 px-2 py-1.5 -mx-1 rounded-lg cursor-pointer transition-colors duration-200 ${
                isActive
                  ? "hover:bg-secondary/60"
                  : "hover:bg-secondary/40 opacity-50 hover:opacity-80"
              }`}
            >
              <span
                className={`w-3 h-3 rounded-full shrink-0 transition-all duration-200 ${dot} ${
                  isActive ? glow : "grayscale opacity-60"
                }`}
              />
              <span
                className={`flex-1 text-left text-[11px] font-medium transition-colors duration-200 ${
                  isActive ? "text-foreground" : "text-muted-foreground line-through decoration-1"
                }`}
              >
                {label}
              </span>
              {isActive ? (
                <Eye className="w-3.5 h-3.5 text-muted-foreground/50 group-hover:text-foreground transition-colors shrink-0" />
              ) : (
                <EyeOff className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-foreground transition-colors shrink-0" />
              )}
            </button>
          );
        })}
        {activeConvoysLength > 0 && (
          <div className="flex items-center justify-between gap-3 border-t border-border/50 pt-2 mt-0.5 animate-in fade-in duration-300">
            <div className="flex items-center gap-2.5">
              <span className="relative flex w-3 h-3">
                <span className="absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-70 animate-ping"></span>
                <span className="relative inline-flex w-3 h-3 rounded-full bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.75)]"></span>
              </span>
              <span className="text-[11px] font-semibold text-foreground">Caravanas en ruta</span>
            </div>
            <span className="min-w-6 px-2 py-0.5 rounded-full bg-amber-400/15 border border-amber-400/30 text-[11px] font-black text-amber-500 dark:text-amber-300 text-center tabular-nums">
              {activeConvoysLength}
            </span>
          </div>
        )}
        {showSupplyRoute && (
          <div className="flex items-center gap-2.5 border-t border-border/50 pt-1.5 mt-0.5 animate-in fade-in duration-300">
            <span className="w-6 h-1 rounded bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]"></span>
            <span className="text-[11px] font-medium text-foreground">Ruta Terrestre Activa</span>
          </div>
        )}
        {userLocation && (
          <div className="flex items-center gap-2.5 border-t border-border/50 pt-2 mt-0.5 animate-in fade-in duration-300">
            <span className="relative flex items-center justify-center w-3 h-3 shrink-0">
              <span className="absolute inline-flex w-full h-full rounded-full bg-[#4A89C0] opacity-60 animate-ping"></span>
              <span className="relative inline-flex items-center justify-center w-3 h-3 rounded-full bg-white shadow-[0_0_8px_rgba(74,137,192,0.6)]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#2B5F8E]"></span>
              </span>
            </span>
            <span className="text-[11px] font-medium text-foreground">Tu ubicación actual</span>
          </div>
        )}
      </div>
    </div>
  );
}
