import { useState, useEffect } from "react";
import { MapPin, X, LocateFixed, MousePointerClick, Info, Loader2, Plus } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { Centro } from "@/lib/map/mapViewerConstants";

export interface HubRegistrationData extends Omit<Centro, "inventario" | "verificacion" | "metadata"> {
  documentType?: "V" | "J";
  cedula?: string;
}

interface PublicHubModalProps {
  onClose: () => void;
  onSubmit: (data: HubRegistrationData) => Promise<void>;
  isSubmitting: boolean;
  initialCoordinates?: [number, number] | null;
  coordinatesSource?: "current-location" | "map-click" | null;
  userLocation?: [number, number] | null;
  hasPickedCoordinates?: boolean;
  onUseCurrentLocation?: () => void;
  onUsePickedLocation?: () => void;
  fieldErrors?: Record<string, string | undefined>;
  formError?: string | null;
}

export function PublicHubModal({
  onClose,
  onSubmit,
  isSubmitting,
  initialCoordinates,
  coordinatesSource = null,
  userLocation = null,
  hasPickedCoordinates = false,
  onUseCurrentLocation,
  onUsePickedLocation,
  fieldErrors = {},
  formError,
}: PublicHubModalProps) {
  const [nombre, setNombre] = useState("");
  const [direccion, setDireccion] = useState("");
  const [responsable, setResponsable] = useState("");
  const [contacto, setContacto] = useState("");
  const [documentType, setDocumentType] = useState<"V" | "J">("V");
  const [cedula, setCedula] = useState("");
  const [latitud, setLatitud] = useState(() => (initialCoordinates ? initialCoordinates[1].toFixed(5) : "9.5832"));
  const [longitud, setLongitud] = useState(() => (initialCoordinates ? initialCoordinates[0].toFixed(5) : "-69.2216"));
  const [pendingData, setPendingData] = useState<HubRegistrationData | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isSubmitting) {
        if (pendingData) {
          setPendingData(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, isSubmitting, pendingData]);

  useEffect(() => {
    if (initialCoordinates) {
      setLatitud(initialCoordinates[1].toFixed(5));
      setLongitud(initialCoordinates[0].toFixed(5));
    }
  }, [initialCoordinates]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim() || !direccion.trim() || !contacto.trim() || !responsable.trim()) return;
    const lat = parseFloat(latitud);
    const lng = parseFloat(longitud);
    if (isNaN(lat) || isNaN(lng)) return;
    const cedulaTrim = cedula.trim();
    setPendingData({
      id: crypto.randomUUID(),
      nombre,
      direccion,
      contacto,
      responsable,
      tipo: "acopio",
      coordenadas: [lng, lat],
      isInformal: true,
      documentType: cedulaTrim ? documentType : undefined,
      cedula: cedulaTrim || undefined,
    } as HubRegistrationData);
  };

  const handleConfirm = () => {
    if (pendingData) {
      onSubmit(pendingData);
    }
  };

  return (
    <>
      <div
        className="fixed bottom-0 left-0 right-0 z-50 md:bottom-6 md:left-auto md:right-6 md:w-[420px] select-text"
        style={{ animation: "hubModalIn 0.38s cubic-bezier(0.32, 0.72, 0, 1) both" }}
      >
        <style>{`
          @keyframes hubModalIn {
            from { transform: translateY(100%); opacity: 0.6; }
            to   { transform: translateY(0);    opacity: 1;   }
          }
          @media (min-width: 768px) {
            @keyframes hubModalIn {
              from { transform: translateY(24px); opacity: 0; }
              to   { transform: translateY(0);    opacity: 1; }
            }
          }
        `}</style>

        <div
          className="w-full rounded-t-3xl md:rounded-2xl bg-card/95 border-t md:border border-border shadow-2xl shadow-black/30 flex flex-col overflow-hidden backdrop-blur-lg"
          style={{ maxHeight: "88vh" }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Drag handle — mobile */}
          <div className="flex justify-center pt-3 pb-0.5 md:hidden">
            <div className="w-9 h-1 bg-muted-foreground/25 rounded-full" />
          </div>

          {/* Header */}
          <div className="px-5 pt-4 pb-3.5 md:pt-5 border-b border-border/60 flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2.5 mb-1.5">
                <div className="flex items-center justify-center w-7 h-7 rounded-xl bg-blue-500/15 border border-blue-500/20 text-blue-400 shrink-0">
                  <MapPin className="w-3.5 h-3.5" />
                </div>
                <h3
                  className="text-base font-black text-foreground uppercase tracking-wide leading-none"
                  style={{ fontFamily: "'Barlow Condensed', sans-serif", fontStyle: "italic" }}
                >
                  Nuevo Centro de Acopio
                </h3>
              </div>

              {/* Coordinates badge */}
              {initialCoordinates && (
                <div className="flex items-center gap-1.5 ml-9">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse shrink-0" />
                    <span className="text-[9.5px] font-mono font-medium tracking-tight">
                      {initialCoordinates[1].toFixed(4)}°, {initialCoordinates[0].toFixed(4)}°
                    </span>
                  </span>
                </div>
              )}

              <p className="text-[10px] text-muted-foreground mt-2 ml-9 leading-relaxed">
                Completa los datos. El centro será visible de inmediato en el mapa.
              </p>
            </div>

            <button
              onClick={onClose}
              className="w-7 h-7 rounded-full bg-secondary/80 hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors duration-150 cursor-pointer shrink-0 mt-0.5 active:scale-[0.92]"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-5 py-4 space-y-3.5 no-scrollbar">
            {formError && (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-[10px] text-red-400">
                <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            {/* Location source selector */}
            <div className="space-y-2 p-3 rounded-xl bg-secondary/40 border border-border">
              <span className="text-[9.5px] font-bold uppercase tracking-wider text-muted-foreground">
                Ubicación del centro
              </span>

              <div className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-background/60 border border-border">
                <button
                  type="button"
                  disabled={!userLocation}
                  onClick={() => onUseCurrentLocation?.()}
                  aria-pressed={coordinatesSource === "current-location"}
                  title={!userLocation ? "Aún no se obtuvo tu ubicación" : "Usar mi ubicación actual"}
                  className={`flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-md text-[10px] font-semibold uppercase tracking-wide transition-all duration-150 active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer ${
                    coordinatesSource === "current-location"
                      ? "bg-[#4A89C0] text-white shadow-sm"
                      : "text-muted-foreground hover:bg-secondary/60"
                  }`}
                >
                  <LocateFixed className="w-3 h-3" />
                  Ubicación actual
                </button>
                <button
                  type="button"
                  disabled={!hasPickedCoordinates}
                  onClick={() => onUsePickedLocation?.()}
                  aria-pressed={coordinatesSource === "map-click"}
                  title={!hasPickedCoordinates ? "Aún no has seleccionado una ubicación" : "Usar ubicación seleccionada"}
                  className={`flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-md text-[10px] font-semibold uppercase tracking-wide transition-all duration-150 active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer ${
                    coordinatesSource === "map-click"
                      ? "bg-emerald-500 text-white shadow-sm"
                      : "text-muted-foreground hover:bg-secondary/60"
                  }`}
                >
                  <MapPin className="w-3 h-3" />
                  Ubicación seleccionada
                </button>
              </div>

              {!hasPickedCoordinates ? (
                <p className="flex items-start gap-1.5 text-[10px] text-muted-foreground leading-relaxed">
                  <MousePointerClick className="w-3 h-3 shrink-0 mt-0.5 text-muted-foreground/70" />
                  <span>Haz click en cualquier punto del mapa para seleccionar una ubicación.</span>
                </p>
              ) : (
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  Arrastra el pin verde en el mapa para ajustar el punto exacto.
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-[9.5px] font-bold uppercase tracking-wider text-muted-foreground">
                Nombre del Centro *
              </label>
              <input
                type="text"
                required
                autoFocus
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="ej. Centro de Acopio Comunitario El Pinar"
                className="w-full px-3 py-2.5 text-xs rounded-xl bg-secondary/50 border border-border text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/10 transition-all duration-200"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[9.5px] font-bold uppercase tracking-wider text-muted-foreground">
                Dirección Física *
              </label>
              <input
                type="text"
                required
                value={direccion}
                onChange={(e) => setDireccion(e.target.value)}
                placeholder="ej. Av. Páez, frente a la Plaza Bolívar"
                className="w-full px-3 py-2.5 text-xs rounded-xl bg-secondary/50 border border-border text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/10 transition-all duration-200"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[9.5px] font-bold uppercase tracking-wider text-muted-foreground">
                  Coordinador/a *
                </label>
                <input
                  type="text"
                  required
                  value={responsable}
                  onChange={(e) => setResponsable(e.target.value)}
                  placeholder="Nombre completo"
                  className="w-full px-3 py-2.5 text-xs rounded-xl bg-secondary/50 border border-border text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/10 transition-all duration-200"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[9.5px] font-bold uppercase tracking-wider text-muted-foreground">
                  WhatsApp *
                </label>
                <input
                  type="text"
                  required
                  value={contacto}
                  onChange={(e) => setContacto(e.target.value)}
                  placeholder="+58 4XX XXX XXXX"
                  className={`w-full px-3 py-2.5 text-xs rounded-xl bg-secondary/50 border text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 transition-all duration-200 ${
                    fieldErrors.contacto
                      ? "border-red-500/50 focus:border-red-500/50 focus:ring-red-500/10"
                      : "border-border focus:border-blue-500/50 focus:ring-blue-500/10"
                  }`}
                />
                {fieldErrors.contacto && <p className="text-[10px] text-red-400">{fieldErrors.contacto}</p>}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[9.5px] font-bold uppercase tracking-wider text-muted-foreground">
                Cédula / RIF <span className="text-muted-foreground/60 normal-case font-normal">(opcional)</span>
              </label>
              <div
                className={`flex items-stretch rounded-xl border bg-secondary/50 focus-within:ring-2 transition-all duration-200 ${
                  fieldErrors.cedula
                    ? "border-red-500/50 focus-within:border-red-500/50 focus-within:ring-red-500/10"
                    : "border-border focus-within:border-blue-500/50 focus-within:ring-blue-500/10"
                }`}
              >
                <div className="relative flex items-center">
                  <select
                    value={documentType}
                    onChange={(e) => setDocumentType(e.target.value as "V" | "J")}
                    aria-label="Tipo de documento"
                    className="h-full appearance-none rounded-l-xl border-r border-border bg-secondary/60 py-2.5 pl-3 pr-6 text-xs font-semibold text-foreground outline-none"
                  >
                    <option value="V">V</option>
                    <option value="J">J</option>
                  </select>
                  <svg
                    className="pointer-events-none absolute right-1.5 h-2.5 w-2.5 text-muted-foreground"
                    viewBox="0 0 12 8"
                    fill="none"
                  >
                    <path
                      d="M1 1.5L6 6.5L11 1.5"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <input
                  type="text"
                  inputMode="numeric"
                  value={cedula}
                  onChange={(e) => setCedula(e.target.value)}
                  placeholder="ej: 12345678"
                  className="flex-1 rounded-r-xl bg-transparent py-2.5 pl-2.5 pr-3 text-xs text-foreground placeholder:text-muted-foreground/50 outline-none"
                />
              </div>
            </div>
            {fieldErrors.cedula && <p className="text-[10px] text-red-400 -mt-1">{fieldErrors.cedula}</p>}

            <div className="flex items-start gap-2 p-3 bg-blue-500/5 border border-blue-500/10 rounded-xl text-[9.5px] text-blue-400/80">
              <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-blue-400" />
              <span>
                Solo puedes registrar centros de acopio. Los puntos de despacho y destinos son gestionados por
                coordinadores autorizados.
              </span>
            </div>

            {/* Buttons */}
            <div className="flex gap-2.5 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2.5 rounded-xl bg-secondary/80 border border-border text-foreground font-semibold text-xs hover:bg-secondary active:scale-[0.97] transition-all duration-150 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-[1.6] flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-600 text-white font-black text-xs hover:bg-blue-500 active:scale-[0.97] transition-all duration-150 disabled:opacity-50 cursor-pointer shadow-lg shadow-blue-600/20"
                style={{ fontFamily: "'Barlow Condensed', sans-serif", fontStyle: "italic" }}
              >
                {isSubmitting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                )}
                REGISTRAR CENTRO
              </button>
            </div>
          </form>
        </div>
      </div>

      <ConfirmDialog
        open={pendingData !== null}
        title={
          coordinatesSource === "current-location"
            ? "¿Usar tu ubicación actual?"
            : coordinatesSource === "map-click"
            ? "Ubicación establecida"
            : "Confirmar registro"
        }
        description={
          coordinatesSource === "current-location" ? (
            <>
              Se usará <strong className="text-[#C8DCF0] font-bold">tu ubicación actual</strong> para registrar el
              punto de acopio. ¿Estás seguro?
            </>
          ) : coordinatesSource === "map-click" ? (
            <>
              Vamos a registrar el centro en la ubicación que marcaste en el mapa. ¿Confirmas que este es el punto
              correcto?
            </>
          ) : (
            <>¿Confirmas que los datos están correctos para registrar el centro?</>
          )
        }
        confirmLabel="Sí, registrar"
        cancelLabel="Revisar"
        tone="default"
        isPending={isSubmitting}
        onConfirm={handleConfirm}
        onCancel={() => {
          if (!isSubmitting) setPendingData(null);
        }}
      />
    </>
  );
}
