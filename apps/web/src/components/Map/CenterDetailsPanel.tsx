import { MapPin, User, Package, ClipboardList, ChevronDown, HeartHandshake, Search, Info, Route, X } from "lucide-react";
import type { Centro } from "@/lib/map/mapViewerConstants";
import type { Necesidad } from "@/hooks/UseMapViewer";

interface CenterDetailsPanelProps {
  selectedCentro: Centro | null;
  setSelectedId: (id: string | null) => void;
  centroNeeds: Necesidad[];
  showDrawerNeeds: boolean;
  setShowDrawerNeeds: (show: boolean) => void;
  setActiveImageUrl: (url: string | null) => void;
}

export function CenterDetailsPanel({
  selectedCentro,
  setSelectedId,
  centroNeeds,
  showDrawerNeeds,
  setShowDrawerNeeds,
  setActiveImageUrl,
}: CenterDetailsPanelProps) {
  if (!selectedCentro) return null;

  return (
    <div
      className={`absolute left-0 right-0 bottom-0 z-40 bg-card/95 border-t border-border shadow-2xl backdrop-blur-lg rounded-t-3xl transition-all duration-500 ease-out md:left-6 md:bottom-6 md:top-auto md:w-96 md:rounded-2xl md:border h-[75vh] md:h-auto md:max-h-[75vh]`}
    >
      <div className="flex flex-col h-full p-4 md:p-5">
        {/* Cabecera del Centro */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-1.5 flex-wrap mb-1">
              <h2 className="text-base font-bold text-foreground tracking-tight leading-snug text-balance">
                {selectedCentro.nombre}
              </h2>
            </div>
            <div className="flex flex-col gap-1 mt-1 text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400 shrink-0" />
                <p className="text-[11px] font-medium leading-none">{selectedCentro.direccion}</p>
              </div>
              <div className="text-[10px] font-mono text-muted-foreground/60 flex items-center gap-1.5 pl-5 select-text">
                <span>Lat: {selectedCentro.coordenadas[1].toFixed(5)}°</span>
                <span className="text-muted-foreground/20">•</span>
                <span>Lng: {selectedCentro.coordenadas[0].toFixed(5)}°</span>
              </div>
            </div>
          </div>
          <button
            onClick={() => setSelectedId(null)}
            className="w-7 h-7 rounded-full bg-secondary/80 hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors duration-150 cursor-pointer shrink-0 active:scale-[0.92]"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto mt-4 pr-1 no-scrollbar pb-4 block">
          {/* Información de Contacto */}
          <div className="grid grid-cols-2 gap-2 p-3 rounded-lg bg-background/50 border border-border/80 mb-4">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-emerald-500 dark:text-emerald-400 shrink-0" />
              <div>
                <p className="text-[9px] text-muted-foreground font-semibold leading-none">Coordinador/a</p>
                <p className="text-[10px] text-foreground font-medium mt-1 leading-none truncate">
                  {selectedCentro.responsable}
                </p>
              </div>
            </div>
            <a
              href={`https://wa.me/${selectedCentro.contacto.replace(
                /[^0-9]/g,
                ""
              )}?text=${encodeURIComponent("Hola, escribo desde el portal de PortuguesaUnida y necesito ayuda")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 border-l border-border pl-3 group hover:bg-secondary p-1 rounded transition-colors"
            >
              <svg
                className="w-4 h-4 text-emerald-500 dark:text-emerald-400 shrink-0 group-hover:scale-110 transition-transform fill-current"
                viewBox="0 0 24 24"
              >
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.458 5.704 1.459h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              <div>
                <p className="text-[9px] text-muted-foreground font-semibold leading-none">Contacto (WhatsApp)</p>
                <p className="text-[10px] text-foreground font-medium mt-1 leading-none truncate group-hover:text-emerald-500 dark:group-hover:text-emerald-400 transition-colors">
                  {selectedCentro.contacto}
                </p>
              </div>
            </a>
          </div>

          {/* Reglas de Embalaje */}
          <div className="mb-4">
            <a
              href="/NORMAS DE EMBALAJE .pdf"
              download="NORMAS DE EMBALAJE .pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-between p-3 rounded-lg bg-background/50 border border-border/80 hover:bg-secondary/50 active:scale-[0.98] transition-[transform,background-color] duration-200 cursor-pointer group"
            >
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-muted-foreground shrink-0" />
                <p className="text-[10px] text-foreground font-medium leading-none">Normas de embalaje</p>
              </div>
              <span className="text-[9px] font-bold text-muted-foreground border border-border/80 px-1.5 py-0.5 rounded">
                PDF
              </span>
            </a>
          </div>

          {/* Necesidades del centro */}
          {centroNeeds.length > 0 && (
            <div className="mb-4">
              <button
                onClick={() => setShowDrawerNeeds(!showDrawerNeeds)}
                className="w-full flex items-center justify-between p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 active:scale-[0.98] transition-all duration-200 cursor-pointer group"
              >
                <div className="flex items-center gap-2">
                  <ClipboardList className="w-4 h-4 text-amber-400 shrink-0" />
                  <p className="text-[10px] text-foreground font-semibold leading-none">
                    Ver necesidades del centro
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    {centroNeeds.length}
                  </span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-amber-400 transition-transform duration-200 ${
                      showDrawerNeeds ? "rotate-180" : ""
                    }`}
                  />
                </div>
              </button>

              {showDrawerNeeds && (
                <div className="mt-2 p-3 rounded-lg border border-amber-400/20 bg-amber-400/5 flex flex-col gap-3.5 animate-in fade-in slide-in-from-top-1 duration-200">
                  <ul className="flex flex-col gap-3.5">
                    {centroNeeds.map((n) => {
                      const pct = n.meta > 0 ? Math.min(Math.round((n.recibido / n.meta) * 100), 100) : 0;
                      return (
                        <li key={n.id} className="text-xs flex flex-col gap-1">
                          <div className="flex justify-between items-start gap-2">
                            <div className="min-w-0">
                              <div className="font-bold text-foreground leading-tight">{n.nombre}</div>
                              {n.categoria && (
                                <div className="text-[9.5px] text-muted-foreground mt-0.5">{n.categoria}</div>
                              )}
                            </div>
                            <span className="text-[10px] font-mono text-amber-400 shrink-0 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                              {n.meta > 0 ? `${n.recibido}/${n.meta} ${n.unidad}` : `${n.recibido} ${n.unidad}`}
                            </span>
                          </div>
                          {n.descripcion && (
                            <p className="text-muted-foreground text-[10.5px] leading-relaxed text-pretty mt-0.5">
                              {n.descripcion}
                            </p>
                          )}
                          {n.meta > 0 && (
                            <div className="flex flex-col gap-1 mt-1">
                              <div className="w-full h-1 bg-secondary/80 rounded-full overflow-hidden">
                                <div className="h-full bg-amber-500 rounded-full" style={{ width: `${pct}%` }} />
                              </div>
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Verificación de Carga */}
          {selectedCentro.verificacion && (
            <div className="mt-5 border-t border-border/50 pt-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <HeartHandshake className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider text-balance">
                    Verificación de Carga
                  </h3>
                </div>
                <span className="text-[10px] text-muted-foreground font-mono bg-secondary/80 px-2 py-0.5 rounded-md border border-border/40">
                  {new Date(selectedCentro.verificacion.fecha).toLocaleDateString("es-VE", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>

              <div className="flex flex-col gap-2.5">
                <div className="grid grid-cols-2 gap-2">
                  {selectedCentro.verificacion.imagenes.map((imgUrl, idx) => (
                    <div
                      key={idx}
                      onClick={() => setActiveImageUrl(imgUrl)}
                      className="relative aspect-[4/3] rounded-md overflow-hidden bg-secondary/50 group cursor-pointer shadow-sm hover:shadow-md ring-1 ring-black/10 dark:ring-white/10 active:scale-[0.96] transition-[box-shadow,transform] duration-200"
                      title="Click para ampliar imagen"
                    >
                      <img
                        src={imgUrl}
                        alt={`Verificación ${idx + 1}`}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                        <span className="text-[10px] text-white font-bold tracking-wider uppercase">Ver foto</span>
                      </div>
                      <div className="absolute bottom-1.5 right-1.5 p-1 rounded bg-black/60 backdrop-blur-sm border border-white/10 text-white opacity-80 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-200">
                        <Search className="w-3 h-3" />
                      </div>
                    </div>
                  ))}
                </div>

                {selectedCentro.verificacion.novedades && (
                  <p className="text-[10.5px] text-muted-foreground text-pretty bg-secondary/30 p-2.5 rounded-lg border border-border/20 italic leading-relaxed mt-0.5">
                    "{selectedCentro.verificacion.novedades}"
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Nota de actualización */}
          <div className="flex items-center gap-2 mt-5 p-3 rounded-lg bg-background/20 border border-border/50 text-muted-foreground text-[10px]">
            <Info className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <span className="text-pretty">
              Esta información es actualizada en tiempo real por el equipo de Portuguesa Unida desde el centro de
              control.
            </span>
          </div>
        </div>

        {/* Botón Cómo llegar */}
        <div className="pt-3 mt-2 border-t border-border/50 shrink-0">
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${selectedCentro.coordenadas[1]},${selectedCentro.coordenadas[0]}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-wider transition-[transform,background-color,box-shadow] duration-200 active:scale-[0.96] cursor-pointer shadow-lg shadow-blue-600/25"
            style={{ fontFamily: "'Barlow Condensed', sans-serif", fontStyle: "italic" }}
          >
            <Route className="w-4 h-4 stroke-[3]" />
            Cómo llegar
          </a>
        </div>
      </div>
    </div>
  );
}
