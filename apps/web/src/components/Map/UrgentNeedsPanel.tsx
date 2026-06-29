import React from "react";
import { ClipboardList, X, Loader2, MapPin } from "lucide-react";
import type { Centro } from "@/lib/map/mapViewerConstants";
import type { Necesidad } from "@/hooks/UseMapViewer";
import { getKmDistance } from "@/lib/map/mapViewerHelpers";

interface UrgentNeedsPanelProps {
  showNeedsPanel: boolean;
  setShowNeedsPanel: (show: boolean) => void;
  isLoadingNeeds: boolean;
  groupNeedsBy: "none" | "centro";
  setGroupNeedsBy: (group: "none" | "centro") => void;
  needs: Necesidad[];
  sortedNeeds: Necesidad[];
  groupedNeedsByCentro: any[];
  centros: Centro[];
  userLocation: [number, number] | null;
  setSelectedId: (id: string | null) => void;
  setSelectedIncidentId: (id: string | null) => void;
  setMapCenter: (coords: [number, number]) => void;
  setMapZoom: React.Dispatch<React.SetStateAction<number>>;
  handleSelectCentro: (centro: Centro) => void;
}

export function UrgentNeedsPanel({
  showNeedsPanel,
  setShowNeedsPanel,
  isLoadingNeeds,
  groupNeedsBy,
  setGroupNeedsBy,
  needs,
  sortedNeeds,
  groupedNeedsByCentro,
  centros,
  userLocation,
  setSelectedId,
  setSelectedIncidentId,
  setMapCenter,
  setMapZoom,
  handleSelectCentro,
}: UrgentNeedsPanelProps) {
  if (!showNeedsPanel) return null;

  return (
    <div
      className="absolute left-0 right-0 bottom-0 z-40 overflow-hidden bg-card/95 border-t border-border shadow-2xl backdrop-blur-lg rounded-t-3xl transition-all duration-500 ease-out md:left-6 md:bottom-6 md:top-auto md:w-96 md:rounded-2xl md:border h-[75vh] max-h-[75vh]"
    >
      <div className="flex h-full min-h-0 flex-col p-4 md:p-5">
        <div className="flex items-center justify-between border-b border-border/50 pb-3 shrink-0">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-emerald-500" />
            <h2 className="text-base font-bold text-foreground tracking-tight">Necesidades urgentes</h2>
          </div>
          <button
            onClick={() => setShowNeedsPanel(false)}
            className="w-7 h-7 rounded-full bg-secondary/80 hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors duration-150 cursor-pointer shrink-0 active:scale-[0.92]"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Selector de Agrupación */}
        {sortedNeeds.length > 0 && (
          <div className="flex gap-2 p-1 bg-secondary/40 rounded-lg shrink-0 mt-3 mb-1">
            <button
              onClick={() => setGroupNeedsBy("none")}
              className={`flex-1 py-1.5 px-3 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all duration-150 cursor-pointer ${
                groupNeedsBy === "none" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Ver todas
            </button>
            <button
              onClick={() => setGroupNeedsBy("centro")}
              className={`flex-1 py-1.5 px-3 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all duration-150 cursor-pointer ${
                groupNeedsBy === "centro" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Por Centro
            </button>
          </div>
        )}

        <div className="mt-4 flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-1 pb-4 no-scrollbar">
          {isLoadingNeeds ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2 text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
              <span className="text-xs font-medium">Cargando necesidades...</span>
            </div>
          ) : groupNeedsBy === "centro" ? (
            groupedNeedsByCentro.length > 0 ? (
              groupedNeedsByCentro.map((group) => {
                const priorityStyles = {
                  CRITICA: { bg: "bg-red-500/10 border-red-500/25 text-red-400" },
                  ALTA: { bg: "bg-amber-500/10 border-amber-500/25 text-amber-400" },
                  MEDIA: { bg: "bg-blue-500/10 border-blue-500/25 text-blue-400" },
                  BAJA: { bg: "bg-gray-500/10 border-gray-500/25 text-gray-400" },
                };
                const style = priorityStyles[group.maxPriority as keyof typeof priorityStyles] ?? priorityStyles.MEDIA;

                return (
                  <div key={group.centro.id} className="p-3.5 rounded-xl bg-background/50 border border-border/80 flex flex-col gap-2.5 animate-in fade-in duration-200">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <h3 className="text-xs font-bold text-foreground leading-tight truncate">{group.centro.nombre}</h3>
                        <div className="flex items-center gap-1.5 mt-1">
                          <MapPin className="w-3 h-3 text-emerald-500 shrink-0" />
                          <span className="text-[9.5px] text-muted-foreground truncate max-w-[180px]">{group.centro.direccion || "Dirección no disponible"}</span>
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border shrink-0 ${style.bg}`}>
                        {group.needs.length} {group.needs.length === 1 ? "necesidad" : "necesidades"}
                      </span>
                    </div>

                    <div className="flex flex-col gap-2 pl-3 border-l-2 border-border/65 mt-1">
                      {group.needs.map((n: Necesidad) => {
                        const pct = n.meta > 0 ? Math.min(Math.round((n.recibido / n.meta) * 100), 100) : 0;
                        return (
                          <div key={n.id} className="text-xs flex flex-col gap-1 py-1 border-b border-border/20 last:border-b-0 last:pb-0">
                            <div className="flex justify-between items-start gap-2">
                              <div className="min-w-0">
                                <span className="font-semibold text-foreground leading-tight">{n.nombre}</span>
                                <span className="text-[9px] text-muted-foreground ml-1.5 font-medium">({n.categoria})</span>
                              </div>
                              <span className="text-[9px] font-mono text-amber-400 shrink-0">
                                {n.meta > 0 ? `${n.recibido}/${n.meta} ${n.unidad}` : `${n.recibido} ${n.unidad}`}
                              </span>
                            </div>
                            {n.descripcion && (
                              <p className="text-muted-foreground text-[10px] leading-snug">{n.descripcion}</p>
                            )}
                            {n.meta > 0 && (
                              <div className="w-full h-0.5 bg-secondary rounded-full overflow-hidden mt-1">
                                <div className="h-full bg-amber-500 rounded-full" style={{ width: `${pct}%` }} />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-border/30 mt-1">
                      {group.distance !== undefined && (
                        <span className="text-[9px] font-bold text-muted-foreground bg-secondary/50 px-1.5 py-0.5 rounded shrink-0">
                          a {group.distance.toFixed(1)} km
                        </span>
                      )}
                      {group.isGeneralEmergency && group.incident ? (
                        <button
                          onClick={() => {
                            setSelectedIncidentId(group.incident!.id);
                            setSelectedId(null);
                            setMapCenter([group.incident!.longitude, group.incident!.latitude]);
                            setMapZoom((z) => Math.max(z, 12));
                            setShowNeedsPanel(false);
                          }}
                          className="ml-auto text-[9px] font-bold text-red-400 hover:text-red-300 cursor-pointer transition-colors shrink-0 flex items-center gap-1"
                        >
                          Ver emergencia
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            handleSelectCentro(group.centro);
                            setShowNeedsPanel(false);
                          }}
                          className="ml-auto text-[9px] font-bold text-blue-400 hover:text-blue-300 cursor-pointer transition-colors shrink-0 flex items-center gap-1"
                        >
                          Ver en mapa
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-8 text-center text-xs text-muted-foreground">
                No hay necesidades registradas.
              </div>
            )
          ) : sortedNeeds.length > 0 ? (
            sortedNeeds.map((n) => {
              const getPctVal = (recibido: number, meta: number) => {
                if (meta <= 0) return 0;
                return Math.min(Math.round((recibido / meta) * 100), 100);
              };
              const pct = getPctVal(n.recibido, n.meta);

              const centro = centros.find((c) => c.id === n.hubId);
              const centroNombre = centro ? centro.nombre : "Centro de acopio";

              const priorityStyles = {
                CRITICA: { bg: "bg-red-500/10 border-red-500/25 text-red-400", label: "Crítica", bar: "bg-red-500" },
                ALTA: { bg: "bg-amber-500/10 border-amber-500/25 text-amber-400", label: "Alta", bar: "bg-amber-500" },
                MEDIA: { bg: "bg-blue-500/10 border-blue-500/25 text-blue-400", label: "Media", bar: "bg-blue-500" },
                BAJA: { bg: "bg-gray-500/10 border-gray-500/25 text-gray-400", label: "Baja", bar: "bg-gray-500" },
              };
              const style = priorityStyles[n.prioridad as keyof typeof priorityStyles] ?? priorityStyles.MEDIA;

              return (
                <div key={n.id} className="p-3.5 rounded-xl bg-background/50 border border-border/80 flex flex-col gap-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="text-xs font-bold text-foreground leading-tight truncate">{n.nombre}</h3>
                      <span className="text-[10px] text-muted-foreground font-medium mt-0.5 block">{n.categoria}</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border shrink-0 ${style.bg}`}>
                      {style.label}
                    </span>
                  </div>

                  {n.descripcion && (
                    <p className="text-[11px] text-muted-foreground leading-normal text-pretty">{n.descripcion}</p>
                  )}

                  {n.meta > 0 ? (
                    <div className="flex flex-col gap-1.5">
                      <div className="flex justify-between text-[10px] font-semibold text-foreground/80">
                        <span>{pct}% cubierto</span>
                        <span className="tabular-nums">{n.recibido} de {n.meta} {n.unidad}</span>
                      </div>
                      <div className="w-full h-1 bg-secondary rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${style.bar}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  ) : (
                    <div className="text-[10px] font-medium text-foreground/70">
                      Recibido: <span className="font-bold text-foreground">{n.recibido} {n.unidad}</span> (Continuo)
                    </div>
                  )}

                  <div className="flex items-center gap-1.5 pt-1.5 border-t border-border/30 mt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span className="text-[10px] font-semibold text-emerald-400/90 truncate max-w-[150px]">{centroNombre}</span>
                    {centro && userLocation && (
                      <span className="text-[9px] font-bold text-muted-foreground bg-secondary/50 px-1.5 py-0.5 rounded shrink-0">
                        a {getKmDistance(userLocation, centro.coordenadas).toFixed(1)} km
                      </span>
                    )}
                    {centro && (
                      <button
                        onClick={() => {
                          handleSelectCentro(centro);
                          setShowNeedsPanel(false);
                        }}
                        className="ml-auto text-[9px] font-bold text-blue-400 hover:text-blue-300 cursor-pointer transition-colors shrink-0"
                      >
                        Ver en mapa
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-12">
              <p className="text-xs text-muted-foreground">No hay necesidades registradas en este momento.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
