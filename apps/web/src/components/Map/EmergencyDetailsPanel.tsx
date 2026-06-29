import { MapPin, X } from "lucide-react";
import type { PublicIncident } from "@sos/shared";
import { INCIDENT_PRIORITY_LABELS, INCIDENT_STATUS_LABELS } from "@/lib/map/mapViewerConstants";

interface EmergencyDetailsPanelProps {
  selectedIncident: PublicIncident | null;
  setSelectedIncidentId: (id: string | null) => void;
}

export function EmergencyDetailsPanel({ selectedIncident, setSelectedIncidentId }: EmergencyDetailsPanelProps) {
  if (!selectedIncident) return null;

  return (
    <div
      className={`absolute left-0 right-0 bottom-0 z-40 overflow-hidden bg-card/95 border-t border-red-500/25 shadow-2xl backdrop-blur-lg rounded-t-3xl transition-all duration-500 ease-out md:left-6 md:bottom-6 md:top-auto md:w-96 md:rounded-2xl md:border h-[45vh] max-h-[75vh] md:h-auto md:max-h-[75vh]`}
    >
      <div className="flex h-full min-h-0 flex-col p-4 md:p-5">
        <div className="flex items-start justify-between gap-3 border-b border-border/50 pb-3 shrink-0">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-1.5">
              <span className="inline-flex items-center rounded-full border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-red-300">
                Emergencia
              </span>
              <span className="inline-flex items-center rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[9px] font-bold text-amber-300">
                {INCIDENT_PRIORITY_LABELS[selectedIncident.priority]}
              </span>
              <span className="inline-flex items-center rounded-full border border-border/70 bg-secondary/60 px-2 py-0.5 text-[9px] font-bold text-muted-foreground">
                {INCIDENT_STATUS_LABELS[selectedIncident.status]}
              </span>
            </div>
            <h2 className="text-base font-bold text-foreground tracking-tight leading-snug text-balance">
              {selectedIncident.title}
            </h2>
            <div className="mt-2 flex items-center gap-1.5 text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-red-400" />
              <p className="text-[11px] font-medium leading-none">{selectedIncident.zone}</p>
            </div>
          </div>
          <button
            onClick={() => setSelectedIncidentId(null)}
            className="w-7 h-7 rounded-full bg-secondary/80 hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors duration-150 cursor-pointer shrink-0 active:scale-[0.92]"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1 pb-4 no-scrollbar">
          <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-[11px] leading-relaxed text-foreground/85 text-pretty">
            {selectedIncident.description}
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 rounded-lg border border-border/80 bg-background/50 p-3">
            <div>
              <p className="text-[9px] text-muted-foreground font-semibold leading-none">Tipo</p>
              <p className="mt-1 text-[10px] font-medium text-foreground truncate">{selectedIncident.type}</p>
            </div>
            <div>
              <p className="text-[9px] text-muted-foreground font-semibold leading-none">Reportado</p>
              <p className="mt-1 text-[10px] font-medium text-foreground tabular-nums">
                {new Date(selectedIncident.createdAt).toLocaleDateString("es-VE", {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </div>

          <div className="mt-3 text-[10px] font-mono text-muted-foreground/70 flex items-center gap-1.5 select-text">
            <span>Lat: {selectedIncident.latitude.toFixed(5)}°</span>
            <span className="text-muted-foreground/20">•</span>
            <span>Lng: {selectedIncident.longitude.toFixed(5)}°</span>
          </div>
        </div>
      </div>
    </div>
  );
}
