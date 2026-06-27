import { useState, useMemo, useEffect } from "react";
import {
  MapPin,
  Phone,
  User,
  Search,
  Package,
  ChevronUp,
  ChevronDown,
  Info,
  Sun,
  Moon,
  Layers,
  HeartHandshake,
  ArrowLeft,
  X,
  Plus,
  Loader2,
  MousePointerClick,
  Route,
  HandHeart,
  SlidersHorizontal,
  Eye,
  EyeOff,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import type { PublicConvoy } from "@sos/shared";
import { Map, MapControls, MapMarker, MapRoute } from "@/components/ui/map";
import { useToast } from "@/components/ui/toast";
import centrosData from "@/data/centros.json";
import { API_URL } from "@/lib/auth/config";
import { getToken } from "@/lib/auth/token-store";
import { HubPendingVerification } from "@/components/hub-pending-verification";
import isotipo from "@/assets/branding/white-isotipo-blue-background.webp";


interface Centro {
  id: string;
  nombre: string;
  direccion: string;
  contacto: string;
  responsable: string;
  coordenadas: [number, number];
  tipo: "acopio" | "salida" | "destino";
  estado?: "ACTIVO" | "INACTIVO";
  inventario: Record<string, number>;
  isInformal?: boolean;
  verificacion?: {
    imagenes: string[];
    fecha: string;
    operario: string;
    novedades?: string;
  };
}

export default function App() {
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    const saved = localStorage.getItem("theme");
    if (saved === "light" || saved === "dark") return saved;
    return "dark"; // Modo oscuro por defecto
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("theme", theme);
  }, [theme]);

  const [centros, setCentros] = useState<Centro[]>(centrosData as unknown as Centro[]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTipos, setActiveTipos] = useState<Set<Centro["tipo"]>>(
    () => new Set(["acopio", "salida", "destino"]),
  );
  const [isDetailsExpanded, setIsDetailsExpanded] = useState(false);
  const [showSupplyRoute, setShowSupplyRoute] = useState(false);
  const [activeImageUrl, setActiveImageUrl] = useState<string | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [clickedCoordinates, setClickedCoordinates] = useState<[number, number] | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  // Nombre del centro recién registrado en el flujo público. Cuando está seteado,
  // se muestra la pantalla de verificación pendiente (llamar a soporte).
  const [pendingVerificationHubName, setPendingVerificationHubName] = useState<string | null>(null);
  const [activeConvoys, setActiveConvoys] = useState<PublicConvoy[]>([]);
  const [showWelcomeModal, setShowWelcomeModal] = useState(() => {
    return !localStorage.getItem("map_welcome_seen");
  });
  const toast = useToast();

  const handleMapClick = (lngLat: [number, number]) => {
    setClickedCoordinates(lngLat);
    setIsRegistering(true);
    // En mobile el modal cubre ~70% de la pantalla — hacemos pan para que
    // el pin quede visible en el tercio superior del área expuesta.
    const isMobile = window.innerWidth < 768;
    if (isMobile) {
      // offset ≈ 35% de la pantalla en grados, según el zoom actual
      const latOffset = 180 / Math.pow(2, mapZoom);
      setMapCenter([lngLat[0], lngLat[1] - latOffset]);
    } else {
      setMapCenter([lngLat[0], lngLat[1]]);
    }
  };

  // Definir la ruta nacional de distribución: Aragua -> Carabobo -> Lara
  const routeCoordinates = useMemo<[number, number][]>(() => {
    const p1 = centros.find(c => c.id === "3")?.coordenadas || [-67.6053, 10.2442]; // ZODI Aragua (Salida)
    const p2 = centros.find(c => c.id === "2")?.coordenadas || [-68.0044, 10.1804]; // Cruz Roja Carabobo (Acopio)
    const p3 = centros.find(c => c.id === "4")?.coordenadas || [-69.3136, 10.0678]; // Lara (Destino)
    return [p1, p2, p3];
  }, [centros]);



  // Cerrar lightbox con la tecla Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setActiveImageUrl(null);
      }
    };
    if (activeImageUrl) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeImageUrl]);

  useEffect(() => {
    fetch(`${API_URL}/centros`)
      .then((res) => {
        if (!res.ok) throw new Error("API response not OK");
        return res.json();
      })
      .then((data) => {
        setCentros(data);
      })
      .catch((err) => {
        console.warn("No se pudo conectar con el API backend, usando fallback local:", err);
      });
  }, []);

  useEffect(() => {
    const loadActiveConvoys = () => {
      fetch(`${API_URL}/convoys?status=EN_RUTA`)
        .then((res) => {
          if (!res.ok) throw new Error("API response not OK");
          return res.json();
        })
        .then((data: PublicConvoy[] | { convoys?: PublicConvoy[]; data?: PublicConvoy[]; items?: PublicConvoy[] }) => {
          if (Array.isArray(data)) {
            setActiveConvoys(data);
            return;
          }
          setActiveConvoys(data.convoys ?? data.data ?? data.items ?? []);
        })
        .catch((err) => {
          console.warn("No se pudieron cargar las caravanas activas:", err);
          setActiveConvoys([]);
        });
    };

    loadActiveConvoys();
    const intervalId = window.setInterval(loadActiveConvoys, 30_000);
    return () => window.clearInterval(intervalId);
  }, []);

  // Obtener el centro seleccionado actualmente
  const selectedCentro = useMemo(() => {
    return centros.find(c => c.id === selectedId) || null;
  }, [selectedId, centros]);

  // Coordenadas iniciales (Portuguesa por defecto la primera vez, o la guardada anteriormente)
  const [mapCenter, setMapCenter] = useState<[number, number]>(() => {
    const saved = localStorage.getItem("map_center");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // Fallback
      }
    }
    const hasEntered = localStorage.getItem("has_entered_map");
    if (hasEntered) {
      return [-66.9036, 10.4806]; // Caracas (default anterior si ya había entrado)
    }
    return [-69.2216, 9.5832]; // Portuguesa (default primera vez)
  });

  const [mapZoom, setMapZoom] = useState<number>(() => {
    const saved = localStorage.getItem("map_zoom");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // Fallback
      }
    }
    const hasEntered = localStorage.getItem("has_entered_map");
    if (hasEntered) {
      return 7; // Zoom default Caracas
    }
    return 8; // Zoom default Portuguesa
  });

  useEffect(() => {
    localStorage.setItem("has_entered_map", "true");
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setMapCenter([position.coords.longitude, position.coords.latitude]);
          setMapZoom(12);
        },
        () => {}
      );
    }
  }, []);

  // Centros visibles en el mapa público: solo los activos. Los inactivos están
  // pendientes de verificación por SOS Logística y no se exponen al público.
  // (Los hubs del JSON seed sin `estado` se consideran ACTIVO por compatibilidad).
  const publicCentros = useMemo(
    () => centros.filter((c) => c.estado !== "INACTIVO"),
    [centros],
  );

  // Filtrar centros según búsqueda y tipo seleccionado
  const filteredCentros = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return publicCentros.filter(c =>
      activeTipos.has(c.tipo) &&
      (c.nombre.toLowerCase().includes(term) ||
        c.direccion.toLowerCase().includes(term))
    );
  }, [publicCentros, searchTerm, activeTipos]);

  const toggleTipo = (tipo: Centro["tipo"]) => {
    setActiveTipos((prev) => {
      const next = new Set(prev);
      if (next.has(tipo)) {
        // Evitar dejar todos apagados: si es el único activo, ignorar el toggle.
        if (next.size === 1) return prev;
        next.delete(tipo);
      } else {
        next.add(tipo);
      }
      return next;
    });
  };

  const handleSelectCentro = (centro: Centro) => {
    setSelectedId(centro.id);
    setMapCenter(centro.coordenadas);
    setMapZoom(11);
    setIsDetailsExpanded(true); // Mostrar panel expandido al seleccionar
  };

  // Color de estado del stock
  const getStockColor = (level: number) => {
    if (level >= 75) return "bg-[#4A89C0]";
    if (level >= 40) return "bg-[#2B5F8E]";
    return "bg-[#C8DCF0]";
  };

  const getStockTextColor = (level: number) => {
    if (level >= 75) return "text-[#4A89C0]";
    if (level >= 40) return "text-[#C8DCF0]";
    return "text-white";
  };

  const getStockLabel = (level: number) => {
    if (level >= 75) return "Abastecido";
    if (level >= 40) return "Limitado";
    return "Bajo Mínimo";
  };

  return (
    <div className="mapa-layout relative flex flex-col select-none bg-background text-foreground transition-colors duration-300 antialiased">
      
      {/* HEADER DE LA APP */}
      <header className="absolute top-4 left-4 right-4 z-40 md:left-6 md:right-auto md:w-max md:max-w-[calc(100vw-48px)] flex items-center justify-between p-3 rounded-2xl bg-card/90 border border-border shadow-2xl backdrop-blur-md transition-shadow transition-colors duration-300">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <Link
            to="/"
            className="flex items-center justify-center w-9 h-9 rounded-lg bg-secondary/80 border border-border text-foreground hover:bg-secondary active:scale-[0.96] transition-[transform,background-color] duration-200 cursor-pointer shrink-0"
            title="Volver a necesidades"
            aria-label="Volver a necesidades"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <img
            src={isotipo}
            alt="Portuguesa Unida"
            className="w-10 h-10 rounded-lg object-cover shrink-0"
          />
          <div className="hidden sm:block min-w-0">
            <h1
              className="text-sm font-black text-foreground m-0 leading-none tracking-wide truncate"
              style={{ fontFamily: "'Barlow Condensed', sans-serif", fontStyle: 'italic' }}
            >
              PORTUGUESA UNIDA
            </h1>
            <p className="text-[10px] text-muted-foreground mt-0.5 leading-none font-medium">Centros de Acopio</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
          <button
            onClick={() => {
              setShowSupplyRoute(prev => !prev);
              if (!showSupplyRoute) {
                setMapCenter([-68.0044, 10.1804]);
                setMapZoom(8);
              }
            }}
            className={`flex items-center justify-center w-8 h-8 rounded-lg border transition-transform transition-colors duration-200 active:scale-[0.96] cursor-pointer shrink-0 ${
              showSupplyRoute 
                ? "bg-emerald-500 text-zinc-950 border-emerald-400 shadow-md shadow-emerald-500/20" 
                : "bg-secondary/80 border-border text-foreground hover:bg-secondary"
            }`}
            title="Mostrar ruta inteligente de distribución"
          >
            <Layers className={`w-4 h-4 ${showSupplyRoute ? "animate-pulse" : ""}`} />
          </button>
          <button
            onClick={() => setShowWelcomeModal(true)}
            className="flex items-center justify-center w-8 h-8 rounded-lg bg-secondary/80 border border-border text-foreground hover:bg-secondary transition-transform transition-colors duration-200 active:scale-[0.96] cursor-pointer shrink-0"
            title="¿Cómo usar el mapa?"
          >
            <Info className="w-4 h-4" />
          </button>
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="flex items-center justify-center w-8 h-8 rounded-lg bg-secondary/80 border border-border text-foreground hover:bg-secondary transition-transform transition-colors duration-200 active:scale-[0.96] cursor-pointer shrink-0"
            title="Cambiar tema"
          >
            {theme === "dark" ? <Sun className="w-4 h-4 text-blue-300" /> : <Moon className="w-4 h-4 text-blue-700" />}
          </button>
          <button
            onClick={() => {
              setClickedCoordinates(null);
              setIsRegistering(true);
            }}
            className="flex items-center justify-center w-8 h-8 md:w-auto md:h-auto md:px-2.5 md:py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-[10px] uppercase tracking-wide active:scale-[0.96] transition-transform duration-200 cursor-pointer shadow-md shadow-blue-600/10 shrink-0"
            style={{ fontFamily: "'Barlow Condensed', sans-serif", fontStyle: 'italic' }}
            title="Registrar nuevo centro de acopio"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            <span className="hidden md:inline ml-1">Registrar</span>
          </button>
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 text-[10px] font-semibold border border-blue-500/20 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping"></span>
            Público
          </div>
        </div>
      </header>

      {/* MAPA PRINCIPAL */}
      <main className="w-full h-full z-10 relative">
        <Map 
          center={mapCenter} 
          zoom={mapZoom} 
          theme={theme} 
          className="w-full h-full"
          onClick={handleMapClick}
          onMoveEnd={(center, zoom) => {
            setMapCenter(center);
            setMapZoom(zoom);
            localStorage.setItem("map_center", JSON.stringify(center));
            localStorage.setItem("map_zoom", JSON.stringify(zoom));
          }}
        >
          <MapControls />
          {showSupplyRoute && (
            <MapRoute coordinates={routeCoordinates} color="#10b981" />
          )}
          {isRegistering && clickedCoordinates && (
            <MapMarker
              coordinates={clickedCoordinates}
              color="#3b82f6"
              active={true}
            />
          )}
          {filteredCentros.map(c => {
            const getMarkerColor = (centroObj: Centro) => {
              switch (centroObj.tipo) {
                case "acopio":
                  return "#3b82f6"; // Azul
                case "salida":
                  return "#ef4444"; // Rojo
                case "destino":
                  return "#22c55e"; // Verde
                default:
                  return "#3b82f6";
              }
            };

            return (
              <MapMarker
                key={c.id}
                coordinates={c.coordenadas}
                onClick={() => handleSelectCentro(c)}
                color={getMarkerColor(c)}
                active={selectedId === c.id}
              />
            );
          })}
        </Map>

        {/* LEYENDA / FILTRO DEL MAPA */}
        <div className={`absolute right-4 z-30 p-3.5 rounded-2xl bg-card/90 border border-border shadow-2xl backdrop-blur-md flex flex-col gap-2.5 min-w-[240px] transition-all duration-300 md:bottom-6 md:right-6 ${
          selectedId ? "bottom-28" : "bottom-4"
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <SlidersHorizontal className="w-3 h-3 text-muted-foreground" />
              <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                Filtrar por tipo
              </h4>
            </div>
            {activeTipos.size < 3 && (
              <button
                onClick={() => setActiveTipos(new Set(["acopio", "salida", "destino"]))}
                className="text-[9px] font-semibold text-blue-400 hover:text-blue-300 uppercase tracking-wider cursor-pointer transition-colors"
              >
                Ver todos
              </button>
            )}
          </div>
          <div className="flex flex-col gap-1">
            {([
              { tipo: "acopio" as const, label: "Hub Interno (Acopio)", dot: "bg-blue-500", glow: "shadow-[0_0_8px_rgba(59,130,246,0.6)]" },
              { tipo: "salida" as const, label: "Salidas ZODI", dot: "bg-red-500", glow: "shadow-[0_0_8px_rgba(239,68,68,0.6)]" },
              { tipo: "destino" as const, label: "Llegada Centro Acopio Destino", dot: "bg-green-500", glow: "shadow-[0_0_8px_rgba(34,197,94,0.6)]" },
            ]).map(({ tipo, label, dot, glow }) => {
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
                    <Eye className="w-3 h-3 text-muted-foreground/50 group-hover:text-foreground transition-colors shrink-0" />
                  ) : (
                    <EyeOff className="w-3 h-3 text-muted-foreground/40 group-hover:text-foreground transition-colors shrink-0" />
                  )}
                </button>
              );
            })}
            {activeConvoys.length > 0 && (
              <div className="flex items-center justify-between gap-3 border-t border-border/50 pt-2 mt-0.5 animate-in fade-in duration-300">
                <div className="flex items-center gap-2.5">
                  <span className="relative flex w-3 h-3">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-70 animate-ping"></span>
                    <span className="relative inline-flex w-3 h-3 rounded-full bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.75)]"></span>
                  </span>
                  <span className="text-[11px] font-semibold text-foreground">Caravanas en ruta</span>
                </div>
                <span className="min-w-6 px-2 py-0.5 rounded-full bg-amber-400/15 border border-amber-400/30 text-[11px] font-black text-amber-500 dark:text-amber-300 text-center tabular-nums">
                  {activeConvoys.length}
                </span>
              </div>
            )}
            {showSupplyRoute && (
              <div className="flex items-center gap-2.5 border-t border-border/50 pt-1.5 mt-0.5 animate-in fade-in duration-300">
                <span className="w-6 h-1 rounded bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]"></span>
                <span className="text-[11px] font-medium text-foreground">Ruta Terrestre Activa</span>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* CONTROLES FLOTANTES / FILTROS (MOBILE FIRST) */}
      <div className="absolute top-24 left-4 right-4 z-30 md:left-6 md:right-auto md:w-96 flex flex-col gap-2">
        {/* Barra de búsqueda */}
        <div className="relative flex items-center">
          <Search className="absolute left-3 w-4 h-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar por ciudad, centro o dirección..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-9 py-2.5 rounded-xl bg-card/90 border border-border text-base md:text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:border-emerald-500/50 shadow-lg backdrop-blur-md transition-all duration-300"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-2.5 flex items-center justify-center w-6 h-6 rounded-full bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground transition-colors active:scale-95"
              title="Limpiar búsqueda"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Dropdown de resultados */}
          {searchTerm.trim() && (
            <div className="absolute top-full left-0 right-0 mt-2 max-h-72 overflow-y-auto no-scrollbar rounded-xl bg-card/95 border border-border shadow-2xl backdrop-blur-md z-50 animate-in fade-in slide-in-from-top-1 duration-200">
              {filteredCentros.length > 0 ? (
                filteredCentros.map((c) => {
                  const dotColor =
                    c.tipo === "salida" ? "bg-red-500" : c.tipo === "destino" ? "bg-green-500" : "bg-blue-500";
                  return (
                    <button
                      key={c.id}
                      onClick={() => {
                        handleSelectCentro(c);
                        setSearchTerm("");
                      }}
                      className="w-full flex items-start gap-2.5 px-3 py-2.5 text-left hover:bg-secondary/60 active:bg-secondary transition-colors border-b border-border/40 last:border-b-0"
                    >
                      <span className={`mt-1 w-2 h-2 rounded-full shrink-0 ${dotColor}`} />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-foreground leading-tight truncate">{c.nombre}</p>
                        <p className="text-[10px] text-muted-foreground leading-tight truncate mt-0.5">{c.direccion}</p>
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="px-3 py-4 text-center">
                  <p className="text-[11px] text-muted-foreground">
                    Sin resultados para «{searchTerm.trim()}»
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

      </div>

      {/* PANEL DE DETALLES DEL CENTRO SELECCIONADO (MOBILE BOTTOM SHEET & DESKTOP SIDEBAR) */}
      <div
        className={`absolute left-0 right-0 bottom-0 z-40 bg-card/95 border-t border-border shadow-2xl backdrop-blur-lg rounded-t-3xl transition-all duration-500 ease-out md:left-6 md:bottom-6 md:top-auto md:w-96 md:rounded-2xl md:border ${
          selectedCentro
            ? isDetailsExpanded
              ? "h-[75vh] md:h-auto md:max-h-[75vh]"
              : "h-24"
            : "translate-y-full h-0 pointer-events-none"
        }`}
      >
        {selectedCentro && (
          <div className="flex flex-col h-full p-4 md:p-5">
            {/* Header del Bottom Sheet / Control de arrastre para mobile */}
            <div 
              className="flex flex-col items-center gap-1.5 cursor-pointer pb-2 md:hidden"
              onClick={() => setIsDetailsExpanded(!isDetailsExpanded)}
            >
              <div className="w-10 h-1 bg-muted rounded-full"></div>
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                {isDetailsExpanded ? (
                  <>
                    <ChevronDown className="w-3.5 h-3.5" />
                    Contraer detalles
                  </>
                ) : (
                  <>
                    <ChevronUp className="w-3.5 h-3.5" />
                    Expandir detalles
                  </>
                )}
              </div>
            </div>

            {/* Cabecera del Centro */}
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-1.5 flex-wrap mb-1">
                  <h2 className="text-base font-bold text-foreground tracking-tight leading-snug text-balance">{selectedCentro.nombre}</h2>
                  {selectedCentro.isInformal ? (
                    <span className="inline-block px-1.5 py-0.5 rounded-full text-[9px] font-semibold border border-amber-500/30 bg-amber-500/10 text-amber-400">
                      Informal
                    </span>
                  ) : (
                    <span className="inline-block px-1.5 py-0.5 rounded-full text-[9px] font-semibold border border-blue-500/30 bg-blue-500/10 text-blue-400">
                      Interno
                    </span>
                  )}
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
                className="hidden md:flex items-center justify-center w-6 h-6 rounded-full bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground transition-colors duration-200 active:scale-[0.96] transition-transform cursor-pointer"
              >
                &times;
              </button>
            </div>

            {/* Contenido Expandible (Inventario y contactos) */}
            <div className={`flex-1 overflow-y-auto mt-4 pr-1 no-scrollbar pb-12 ${isDetailsExpanded ? "block" : "hidden md:block"}`}>
              
              {/* Información de Contacto */}
              <div className="grid grid-cols-2 gap-2 p-3 rounded-lg bg-background/50 border border-border/80 mb-4">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-emerald-500 dark:text-emerald-400 shrink-0" />
                  <div>
                    <p className="text-[9px] text-muted-foreground font-semibold leading-none">Coordinador/a</p>
                    <p className="text-[10px] text-foreground font-medium mt-1 leading-none truncate">{selectedCentro.responsable}</p>
                  </div>
                </div>
                <a 
                  href={`https://wa.me/${selectedCentro.contacto.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(`Hola ${selectedCentro.responsable}, te contacto desde el mapa público de SOS Logística por el centro de acopio: ${selectedCentro.nombre}.`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 border-l border-border pl-3 group hover:bg-secondary p-1 rounded transition-colors"
                >
                  <Phone className="w-4 h-4 text-emerald-500 dark:text-emerald-400 shrink-0 group-hover:scale-110 transition-transform" />
                  <div>
                    <p className="text-[9px] text-muted-foreground font-semibold leading-none">Contacto (WhatsApp)</p>
                    <p className="text-[10px] text-foreground font-medium mt-1 leading-none truncate group-hover:text-emerald-500 dark:group-hover:text-emerald-400 transition-colors">{selectedCentro.contacto}</p>
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
                  <span className="text-[9px] font-bold text-muted-foreground border border-border/80 px-1.5 py-0.5 rounded">PDF</span>
                </a>
              </div>

              {/* Inventario por Categorías */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Package className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Inventario Disponible</h3>
                </div>

                <div className="flex flex-col gap-3">
                  {Object.entries(selectedCentro.inventario).map(([categoria, nivel]) => (
                    <div key={categoria} className="flex flex-col gap-1">
                      <div className="flex items-center justify-between text-xs font-medium">
                        <span className="text-foreground text-[11px]">{categoria}</span>
                        <span className={`text-[10px] font-bold ${getStockTextColor(nivel)}`}>
                          <span className="tabular-nums font-mono">{nivel}%</span> • {getStockLabel(nivel)}
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-secondary overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${getStockColor(nivel)}`}
                          style={{ width: `${nivel}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Verificación de Carga Útil */}
              {selectedCentro.verificacion && (
                <div className="mt-5 border-t border-border/50 pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <HeartHandshake className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
                      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider text-balance">Verificación de Carga</h3>
                    </div>
                    <span className="text-[10px] text-muted-foreground font-mono bg-secondary/80 px-2 py-0.5 rounded-md border border-border/40">
                      {new Date(selectedCentro.verificacion.fecha).toLocaleDateString("es-VE", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit"
                      })}
                    </span>
                  </div>

                  <div className="flex flex-col gap-2.5">
                    {/* Imágenes de verificación */}
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
                          {/* Lupa de zoom permanente en móvil / hover en desktop */}
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
                <span className="text-pretty">Esta información es actualizada en tiempo real por el equipo de SOS Logística desde el centro de control.</span>
              </div>
            </div>
            
          </div>
        )}
      </div>

      {/* Lightbox / Modal de Verificación */}
      {activeImageUrl && (
        <div
          onClick={() => setActiveImageUrl(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md cursor-zoom-out animate-in fade-in duration-200"
        >
          <div className="relative max-w-[90vw] max-h-[85vh] md:max-w-4xl flex flex-col items-center animate-in zoom-in-95 duration-300">
            <button
              onClick={() => setActiveImageUrl(null)}
              className="absolute -top-12 right-0 text-white hover:text-gray-300 font-semibold text-xs bg-white/10 hover:bg-white/20 px-3.5 py-1.5 rounded-lg border border-white/10 active:scale-95 transition-[transform,background-color] duration-200 cursor-pointer"
            >
              Cerrar (Esc)
            </button>
            <img
              src={activeImageUrl}
              alt="Verificación ampliada"
              className="w-full h-full object-contain rounded-2xl shadow-2xl border border-white/10 cursor-default"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}

      {showWelcomeModal && (
        <WelcomeModal onClose={() => {
          localStorage.setItem("map_welcome_seen", "1");
          setShowWelcomeModal(false);
        }} />
      )}

      {isRegistering && (
        <PublicHubModal
          onClose={() => {
            setIsRegistering(false);
            setClickedCoordinates(null);
          }}
          initialCoordinates={clickedCoordinates}
          isSubmitting={isSaving}
          onSubmit={async (data) => {
            setIsSaving(true);
            try {
              const token = getToken();
              const headers: HeadersInit = {
                "Content-Type": "application/json",
              };
              if (token) {
                headers["Authorization"] = `Bearer ${token}`;
              }
              const res = await fetch(`${API_URL}/centros`, {
                method: "POST",
                headers,
                body: JSON.stringify({
                  ...data,
                  // Los centros propuestos desde el mapa público arrancan inactivos
                  // hasta que un coordinador interno de SOS Logística los verifique.
                  estado: "INACTIVO",
                  inventario: {}, // Se registra sin inventario inicial
                }),
              });
              if (!res.ok) throw new Error("Fallo al guardar");
              // Volver a cargar la lista (los inactivos no aparecen en el mapa, pero
              // mantenemos el estado fresco por si admin entra después).
              const listRes = await fetch(`${API_URL}/centros`);
              if (listRes.ok) {
                const listData = await listRes.json();
                setCentros(listData);
              }
              setIsRegistering(false);
              setPendingVerificationHubName(data.nombre);
            } catch (err) {
              console.error(err);
              toast.error('No se pudo registrar el centro', 'Verifica los datos e intenta de nuevo.');
            } finally {
              setIsSaving(false);
            }
          }}
        />
      )}

      {pendingVerificationHubName && (
        <PostRegisterVerificationOverlay
          hubName={pendingVerificationHubName}
          onClose={() => setPendingVerificationHubName(null)}
        />
      )}
    </div>
  );
}

function WelcomeModal({ onClose }: { onClose: () => void }) {
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
        {/* Franja decorativa superior */}
        <div className="h-1 w-full bg-gradient-to-r from-blue-600 via-blue-400 to-blue-600" />

        {/* Cabecera */}
        <div className="p-5 pb-4 flex items-start justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-blue-400 mb-1">
              Mapa Público · SOS Logística
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

        {/* Leyenda de puntos */}
        <div className="px-5 pb-4">
          <div className="flex flex-col gap-2.5 p-3 rounded-xl bg-secondary/40 border border-border/60">
            <div className="flex items-start gap-2">
              <span className="mt-[3px] shrink-0 w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_6px_rgba(59,130,246,0.7)]" />
              <div>
                <p className="text-[10px] text-foreground font-semibold leading-none mb-0.5">Acopio</p>
                <p className="text-[10px] text-muted-foreground leading-relaxed text-pretty">
                  Puntos donde la comunidad entrega donaciones y suministros.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="mt-[3px] shrink-0 w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.7)]" />
              <div>
                <p className="text-[10px] text-foreground font-semibold leading-none mb-0.5">Salida ZODI</p>
                <p className="text-[10px] text-muted-foreground leading-relaxed text-pretty">
                  Sitios donde se concentran los insumos acopiados para despacharlos hacia los puntos de llegada (destinos verdes).
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="mt-[3px] shrink-0 w-2.5 h-2.5 rounded-full bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.7)]" />
              <div>
                <p className="text-[10px] text-foreground font-semibold leading-none mb-0.5">Destino</p>
                <p className="text-[10px] text-muted-foreground leading-relaxed text-pretty">
                  Puntos de llegada donde se recibe y distribuye la ayuda a la población afectada.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Instrucciones */}
        <div className="px-5 pb-5 flex flex-col gap-3">
          <div className="flex items-start gap-3">
            <div className="shrink-0 w-8 h-8 rounded-lg bg-blue-500/15 border border-blue-500/20 flex items-center justify-center">
              <MousePointerClick className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-foreground leading-none mb-0.5">Toca un marcador</p>
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                Ve el inventario, contacto y estado de cada centro de acopio.
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
                Encuentra centros por nombre o filtra por categoría de suministros disponibles.
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
            className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-sm uppercase tracking-wide transition-colors duration-200 active:scale-[0.98] transition-transform cursor-pointer shadow-lg shadow-blue-600/20"
            style={{ fontFamily: "'Barlow Condensed', sans-serif", fontStyle: "italic" }}
          >
            Explorar el mapa
          </button>
        </div>
      </div>
    </div>
  );
}

interface PublicHubModalProps {
  onClose: () => void;
  onSubmit: (data: Omit<Centro, "inventario" | "verificacion" | "metadata">) => Promise<void>;
  isSubmitting: boolean;
  initialCoordinates?: [number, number] | null;
}

function PublicHubModal({ onClose, onSubmit, isSubmitting, initialCoordinates }: PublicHubModalProps) {
  const [nombre, setNombre] = useState("");
  const [direccion, setDireccion] = useState("");
  const [responsable, setResponsable] = useState("");
  const [contacto, setContacto] = useState("");
  const [latitud, setLatitud] = useState(() => initialCoordinates ? initialCoordinates[1].toFixed(5) : "9.5832");
  const [longitud, setLongitud] = useState(() => initialCoordinates ? initialCoordinates[0].toFixed(5) : "-69.2216");

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isSubmitting) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, isSubmitting]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim() || !direccion.trim() || !contacto.trim() || !responsable.trim()) return;
    const lat = parseFloat(latitud);
    const lng = parseFloat(longitud);
    if (isNaN(lat) || isNaN(lng)) return;
    onSubmit({
      id: crypto.randomUUID(),
      nombre,
      direccion,
      contacto,
      responsable,
      tipo: "acopio",
      coordenadas: [lng, lat],
      isInformal: true,
    } as any);
  };

  const lng = parseFloat(longitud) || -69.2216;
  const lat = parseFloat(latitud) || 9.5832;

  return (
    <>
      {/* Panel flotante — bottom sheet en mobile, panel lateral en desktop */}
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
          {/* Drag handle — solo mobile */}
          <div className="flex justify-center pt-3 pb-0.5 md:hidden">
            <div className="w-9 h-1 bg-muted-foreground/25 rounded-full" />
          </div>

          {/* Cabecera */}
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

              {/* Pill de coordenadas — contexto de dónde se hizo clic */}
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

          {/* Formulario */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-5 py-4 space-y-3.5 no-scrollbar">

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
                  className="w-full px-3 py-2.5 text-xs rounded-xl bg-secondary/50 border border-border text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/10 transition-all duration-200"
                />
              </div>
            </div>

            {/* Mini mapa de ubicación */}
            <div className="space-y-2 pt-1 border-t border-border/50">
              <div className="flex items-center justify-between">
                <label className="text-[9.5px] font-bold uppercase tracking-wider text-muted-foreground">
                  Ubicación Exacta
                </label>
                <span className="text-[9px] font-mono text-muted-foreground/50 bg-secondary/40 px-2 py-0.5 rounded-md border border-border/30 tabular-nums">
                  {lat.toFixed(4)}°, {lng.toFixed(4)}°
                </span>
              </div>

              {/* <div className="w-full h-36 rounded-xl overflow-hidden border border-border/60 relative ring-1 ring-border/30">
                <Map
                  center={[lng, lat]}
                  zoom={13}
                  onClick={(lngLat) => {
                    setLongitud(lngLat[0].toFixed(5));
                    setLatitud(lngLat[1].toFixed(5));
                  }}
                  className="w-full h-full"
                >
                  <MapMarker
                    coordinates={[lng, lat]}
                    color="#3b82f6"
                    active={true}
                    draggable={true}
                    onDragEnd={(lngLat) => {
                      setLongitud(lngLat[0].toFixed(5));
                      setLatitud(lngLat[1].toFixed(5));
                    }}
                  />
                </Map>
                <div className="absolute bottom-2 left-2 px-2 py-1 rounded-lg bg-black/70 text-[8.5px] text-white/70 pointer-events-none backdrop-blur-sm border border-white/5">
                  Hacé clic o arrastrá el marcador
                </div>
              </div> */}
            </div>

            <div className="flex items-start gap-2 p-3 bg-blue-500/5 border border-blue-500/10 rounded-xl text-[9.5px] text-blue-400/80">
              <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-blue-400" />
              <span>Solo puedes registrar centros de acopio. Los puntos de despacho y destinos son gestionados por coordinadores autorizados.</span>
            </div>

            {/* Botones */}
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
                {isSubmitting
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                }
                REGISTRAR CENTRO
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

interface PostRegisterVerificationOverlayProps {
  hubName: string;
  onClose: () => void;
}

function PostRegisterVerificationOverlay({ hubName, onClose }: PostRegisterVerificationOverlayProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-[#0A1A2A]/80 backdrop-blur-md p-4 animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative w-full max-w-xl animate-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="rounded-2xl bg-[#0F2337]/95 border border-[#2B5F8E]/50 shadow-[0_20px_60px_rgba(0,0,0,0.6)] p-1">
          <HubPendingVerification hubName={hubName} variant="post-register" />
          <div className="px-6 pb-5 pt-1 flex justify-center">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white/80 text-xs font-semibold tracking-wide transition-colors active:scale-[0.97]"
            >
              Entendido
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
