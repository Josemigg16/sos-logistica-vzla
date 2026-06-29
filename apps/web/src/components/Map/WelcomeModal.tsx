import { useEffect } from "react";
import { X, MousePointerClick, Search, Route, Layers, MapPin, HandHeart, Plus } from "lucide-react";
import { CENTRO_TYPES, CENTRO_TYPE_UI } from "@/lib/map/mapViewerConstants";

interface WelcomeModalProps {
  onClose: () => void;
}

export function WelcomeModal({ onClose }: WelcomeModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-300"
      onClick={onClose}
    >
      <div
        className="relative w-full md:max-w-md md:rounded-2xl bg-card border-t md:border border-border shadow-2xl flex flex-col max-h-[90vh] animate-in slide-in-from-bottom duration-300 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Decorative upper strip */}
        <div className="h-1 w-full bg-gradient-to-r from-blue-600 via-blue-400 to-blue-600" />

        {/* Header */}
        <div className="p-5 pb-4 flex items-start justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-blue-400 mb-1">
              Mapa Público · Portuguesa Unida
            </p>
            <h2
              className="text-xl font-black text-foreground uppercase leading-tight"
              style={{ fontFamily: "'Barlow Condensed', sans-serif", fontStyle: "italic" }}
            >
              Centros de Acopio
            </h2>
            <p className="text-[11px] text-muted-foreground mt-1.5 leading-relaxed text-balance">
              Mapa en tiempo real de la red de acopio y distribución de ayuda humanitaria en el estado Portuguesa.
            </p>
          </div>
          <button
            onClick={onClose}
            className="ml-3 shrink-0 w-7 h-7 rounded-full bg-secondary hover:bg-secondary/80 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Legend */}
        <div className="px-5 pb-4">
          <div className="flex flex-col gap-2.5 p-3 rounded-xl bg-secondary/40 border border-border/60">
            {CENTRO_TYPES.map((tipo) => {
              const { dot, glow, legendTitle, legendDescription } = CENTRO_TYPE_UI[tipo];
              return (
                <div key={tipo} className="flex items-start gap-2">
                  <span className={`mt-[3px] shrink-0 w-2.5 h-2.5 rounded-full ${dot} ${glow}`} />
                  <div>
                    <p className="text-[10px] text-foreground font-semibold leading-none mb-0.5">{legendTitle}</p>
                    <p className="text-[10px] text-muted-foreground leading-relaxed text-pretty">
                      {legendDescription}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Instructions */}
        <div className="px-5 pb-5 flex flex-col gap-3">
          <div className="flex items-start gap-3">
            <div className="shrink-0 w-8 h-8 rounded-lg bg-blue-500/15 border border-blue-500/20 flex items-center justify-center">
              <MousePointerClick className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-foreground leading-none mb-0.5">Toca un marcador</p>
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                Ve las necesidades, contacto y estado de cada centro de acopio.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="shrink-0 w-8 h-8 rounded-lg bg-blue-500/15 border border-blue-500/20 flex items-center justify-center">
              <Search className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-foreground leading-none mb-0.5">Busca y filtra</p>
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                Encuentra centros por nombre o filtra por tipo de centro.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="shrink-0 w-8 h-8 rounded-lg bg-blue-500/15 border border-blue-500/20 flex items-center justify-center">
              <Route className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-foreground leading-none mb-0.5">Rutas de distribución</p>
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                Activa la ruta de suministros{" "}
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-secondary border border-border text-[9px] font-mono align-middle">
                  <Layers className="w-2.5 h-2.5 inline" />
                </span>{" "}
                o traza una ruta personalizada{" "}
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-secondary border border-border text-[9px] font-mono align-middle">
                  <MapPin className="w-2.5 h-2.5 inline" />
                </span>
                .
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="shrink-0 w-8 h-8 rounded-lg bg-blue-500/15 border border-blue-500/20 flex items-center justify-center">
              <HandHeart className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-foreground leading-none mb-0.5">Registra un centro</p>
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                ¿Conoces un centro que no aparece? Regístralo con el botón{" "}
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-blue-600 text-white text-[9px] font-bold align-middle">
                  <Plus className="w-2.5 h-2.5 inline stroke-[3]" /> Registrar
                </span>
                .
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="p-4 pt-0">
          <button
            onClick={onClose}
            className="group w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-sm uppercase tracking-wide transition-colors duration-200 active:scale-[0.98] transition-transform cursor-pointer shadow-lg shadow-blue-600/20"
            style={{ fontFamily: "'Barlow Condensed', sans-serif", fontStyle: "italic" }}
          >
            Explorar el mapa
          </button>
        </div>
      </div>
    </div>
  );
}
