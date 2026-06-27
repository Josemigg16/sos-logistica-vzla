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
  Loader2
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import type { PublicConvoy } from "@sos/shared";
import { Map, MapControls, MapMarker, MapRoute } from "@/components/ui/map";
import { useToast } from "@/components/ui/toast";
import centrosData from "@/data/centros.json";
import { API_URL } from "@/lib/auth/config";
import isotipo from "@/assets/branding/white-isotipo-blue-background.webp";


interface Centro {
  id: string;
  nombre: string;
  direccion: string;
  contacto: string;
  responsable: string;
  coordenadas: [number, number];
  tipo: "acopio" | "salida" | "destino";
  inventario: Record<string, number>;
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
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string | null>(null);
  const [isDetailsExpanded, setIsDetailsExpanded] = useState(false);
  const [showSupplyRoute, setShowSupplyRoute] = useState(false);
  const [activeImageUrl, setActiveImageUrl] = useState<string | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeConvoys, setActiveConvoys] = useState<PublicConvoy[]>([]);
  const toast = useToast();

  // Estados para la ruta personalizada entre dos puntos
  const [isCustomRoutingMode, setIsCustomRoutingMode] = useState(false);
  const [customRoutePoints, setCustomRoutePoints] = useState<[number, number][]>([]);

  // Manejar el clic en el mapa para el trazado personalizado
  const handleMapClick = (lngLat: [number, number]) => {
    if (!isCustomRoutingMode) return;
    setCustomRoutePoints(prev => {
      if (prev.length >= 2) {
        return [lngLat];
      } else {
        return [...prev, lngLat];
      }
    });
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

  // Coordenadas iniciales (Venezuela)
  const [mapCenter, setMapCenter] = useState<[number, number]>([-66.9036, 10.4806]);
  const [mapZoom, setMapZoom] = useState(7);

  // Categorías de inventario disponibles
  const categorias = [
    "Víveres",
    "Herramientas",
    "Higiene personal",
    "Medicamentos",
    "Productos de limpieza",
    "Abrigo y refugio",
    "Artículos para bebés y grupos vulnerables"
  ];

  // Filtrar centros según búsqueda y categoría seleccionada
  const filteredCentros = useMemo(() => {
    return centros.filter(c => {
      const matchesSearch = c.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            c.direccion.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = !selectedCategoryFilter || 
                               (c.inventario[selectedCategoryFilter] && c.inventario[selectedCategoryFilter] > 30); // Consideramos que lo tiene si stock > 30%
      
      return matchesSearch && matchesCategory;
    });
  }, [centros, searchTerm, selectedCategoryFilter]);

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
      <header className="absolute top-4 left-4 right-4 z-40 md:left-6 md:right-auto md:w-96 flex items-center justify-between p-3 rounded-2xl bg-card/90 border border-border shadow-2xl backdrop-blur-md transition-shadow transition-colors duration-300">
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
                setIsCustomRoutingMode(false);
                setCustomRoutePoints([]);
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
            onClick={() => {
              setIsCustomRoutingMode(prev => {
                const newValue = !prev;
                if (newValue) {
                  setShowSupplyRoute(false);
                  setCustomRoutePoints([]);
                  setSelectedId(null);
                }
                return newValue;
              });
            }}
            className={`flex items-center justify-center w-8 h-8 rounded-lg border transition-transform transition-colors duration-200 active:scale-[0.96] cursor-pointer shrink-0 ${
              isCustomRoutingMode 
                ? "bg-amber-500 text-zinc-950 border-amber-400 shadow-md shadow-amber-500/20" 
                : "bg-secondary/80 border-border text-foreground hover:bg-secondary"
            }`}
            title="Trazar ruta personalizada haciendo clics"
          >
            <MapPin className={`w-4 h-4 ${isCustomRoutingMode ? "animate-bounce" : ""}`} />
          </button>
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="flex items-center justify-center w-8 h-8 rounded-lg bg-secondary/80 border border-border text-foreground hover:bg-secondary transition-transform transition-colors duration-200 active:scale-[0.96] cursor-pointer shrink-0"
            title="Cambiar tema"
          >
            {theme === "dark" ? <Sun className="w-4 h-4 text-blue-300" /> : <Moon className="w-4 h-4 text-blue-700" />}
          </button>
          <button
            onClick={() => setIsRegistering(true)}
            className="flex items-center justify-center w-8 h-8 md:w-auto md:h-auto md:px-2.5 md:py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-[10px] uppercase tracking-wide active:scale-[0.96] transition-transform duration-200 cursor-pointer shadow-md shadow-blue-600/10 shrink-0"
            style={{ fontFamily: "'Barlow Condensed', sans-serif", fontStyle: 'italic' }}
            title="Proponer nuevo centro de acopio"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            <span className="hidden md:inline ml-1">Proponer</span>
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
        >
          <MapControls />
          {showSupplyRoute && (
            <MapRoute coordinates={routeCoordinates} color="#10b981" />
          )}
          {isCustomRoutingMode && customRoutePoints.length === 2 && (
            <MapRoute coordinates={customRoutePoints} color="#f59e0b" />
          )}
          {isCustomRoutingMode && customRoutePoints[0] && (
            <MapMarker 
              coordinates={customRoutePoints[0]} 
              color="#f59e0b" 
              active={true}
            />
          )}
          {isCustomRoutingMode && customRoutePoints[1] && (
            <MapMarker 
              coordinates={customRoutePoints[1]} 
              color="#d97706" 
              active={true}
            />
          )}
          {filteredCentros.map(c => {
            const getMarkerColor = (tipo: Centro["tipo"]) => {
              switch (tipo) {
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
                color={getMarkerColor(c.tipo)}
                active={selectedId === c.id}
              />
            );
          })}
        </Map>

        {/* LEYENDA DEL MAPA */}
        <div className={`absolute right-4 z-30 p-3.5 rounded-2xl bg-card/90 border border-border shadow-2xl backdrop-blur-md flex flex-col gap-2 min-w-[220px] transition-all duration-300 md:bottom-6 md:right-6 ${
          selectedId ? "bottom-28" : "bottom-4"
        }`}>
          <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Leyenda</h4>
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2.5">
              <span className="w-3 h-3 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]"></span>
              <span className="text-[11px] font-medium text-foreground">Centros de Acopios</span>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="w-3 h-3 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]"></span>
              <span className="text-[11px] font-medium text-foreground">Salidas ZODI</span>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="w-3 h-3 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></span>
              <span className="text-[11px] font-medium text-foreground">Llegada Centro Acopio Destino</span>
            </div>
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
          <Search className="absolute left-3 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por ciudad, centro o dirección..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-card/90 border border-border text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:border-emerald-500/50 shadow-lg backdrop-blur-md transition-all duration-300"
          />
        </div>

        {/* Filtros rápidos de categorías horizontal scrollable */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar -mx-1 px-1">
          <button
            onClick={() => setSelectedCategoryFilter(null)}
            className={`px-3 py-1.5 rounded-full text-[10px] font-medium whitespace-nowrap transition-colors duration-200 border active:scale-[0.96] transition-transform ${
              !selectedCategoryFilter
                ? "bg-[#2B5F8E] text-white border-[#4A89C0]/60 shadow-lg shadow-[#2B5F8E]/30 font-semibold"
                : "bg-card/90 text-muted-foreground border-border hover:text-foreground"
            }`}
          >
            Todos
          </button>
          {categorias.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategoryFilter(selectedCategoryFilter === cat ? null : cat)}
              className={`px-3 py-1.5 rounded-full text-[10px] font-medium whitespace-nowrap transition-colors duration-200 border active:scale-[0.96] transition-transform ${
                selectedCategoryFilter === cat
                  ? "bg-[#2B5F8E] text-white border-[#4A89C0]/60 shadow-lg shadow-[#2B5F8E]/30 font-semibold"
                  : "bg-card/90 text-muted-foreground border-border hover:text-foreground"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* INDICACIONES DE RUTA PERSONALIZADA */}
        {isCustomRoutingMode && (
          <div className="p-3.5 rounded-xl bg-card/90 border border-border shadow-lg backdrop-blur-md flex flex-col gap-1 transition-all duration-300 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-center justify-between">
              <h4 className="text-[9px] font-extrabold text-amber-500 uppercase tracking-wider">Modo Ruta Personalizada</h4>
              <button 
                onClick={() => {
                  setIsCustomRoutingMode(false);
                  setCustomRoutePoints([]);
                }}
                className="text-[9px] font-bold text-muted-foreground hover:text-foreground active:scale-95 transition-transform"
              >
                &times; Cerrar
              </button>
            </div>
            <p className="text-[11px] text-foreground font-medium mt-0.5 leading-snug">
              {customRoutePoints.length === 0 && "Haz clic en el mapa para marcar el Origen (A)."}
              {customRoutePoints.length === 1 && "Haz clic en el mapa para marcar el Destino (B)."}
              {customRoutePoints.length === 2 && "Ruta calculada. Vuelve a hacer clic para trazar otra."}
            </p>
            {customRoutePoints.length > 0 && (
              <button
                onClick={() => setCustomRoutePoints([])}
                className="w-full mt-2 py-1.5 px-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-[10px] uppercase tracking-wide shadow transition-colors active:scale-[0.97]"
              >
                Limpiar Puntos
              </button>
            )}
          </div>
        )}
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
                <h2 className="text-base font-bold text-foreground tracking-tight leading-snug text-balance">{selectedCentro.nombre}</h2>
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

              {/* Reglas de Embalaje con animación llamativa */}
              <div className="mb-4">
                <style>{`
                  @keyframes border-glow {
                    0%, 100% { border-color: rgba(59, 130, 246, 0.4); box-shadow: 0 0 8px rgba(59, 130, 246, 0.15); }
                    50% { border-color: rgba(59, 130, 246, 0.8); box-shadow: 0 0 16px rgba(59, 130, 246, 0.35); }
                  }
                  @keyframes pulse-scale {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.02); }
                  }
                  .animate-border-glow {
                    animation: border-glow 2s infinite ease-in-out;
                  }
                  .animate-pulse-scale {
                    animation: pulse-scale 2.5s infinite ease-in-out;
                  }
                `}</style>
                <a
                  href="/NORMAS DE EMBALAJE .pdf"
                  download="NORMAS DE EMBALAJE .pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full relative flex items-center justify-between p-3.5 rounded-xl border bg-gradient-to-r from-blue-600/10 to-blue-500/5 hover:from-blue-600/20 hover:to-blue-500/10 text-blue-400 hover:text-blue-300 transition-all duration-300 active:scale-[0.98] cursor-pointer overflow-hidden group animate-border-glow animate-pulse-scale"
                >
                  {/* Subtle pulsing background dot */}
                  <span className="absolute -left-1 -top-1 w-3 h-3 rounded-full bg-blue-500 blur-sm animate-ping opacity-75" />
                  
                  <div className="flex items-center gap-2.5 z-10">
                    <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-blue-500/20 text-blue-400 group-hover:scale-110 transition-transform duration-300">
                      <Package className="w-4 h-4 animate-bounce" />
                    </div>
                    <div className="text-left">
                      <p className="text-[11px] leading-tight font-extrabold tracking-wide text-white group-hover:text-blue-300 transition-colors">📦 REGLAS DE EMBALAJE</p>
                      <p className="text-[9px] text-muted-foreground font-normal lowercase tracking-normal mt-0.5 normal-case">Presiona para descargar las normas en PDF</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 z-10 bg-blue-500/20 text-blue-400 px-2 py-1 rounded-md text-[9px] font-black border border-blue-500/30 group-hover:bg-blue-500 group-hover:text-white transition-colors duration-300">
                    PDF
                  </div>
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

      {isRegistering && (
        <PublicHubModal
          onClose={() => setIsRegistering(false)}
          isSubmitting={isSaving}
          onSubmit={async (data) => {
            setIsSaving(true);
            try {
              const res = await fetch(`${API_URL}/centros`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  ...data,
                  inventario: {}, // Se registra sin inventario inicial
                }),
              });
              if (!res.ok) throw new Error("Fallo al guardar");
              // Volver a cargar la lista
              const listRes = await fetch(`${API_URL}/centros`);
              if (listRes.ok) {
                const listData = await listRes.json();
                setCentros(listData);
              }
              setIsRegistering(false);
              toast.success('Centro de acopio registrado', 'Tu centro ya aparece en el mapa público.');
            } catch (err) {
              console.error(err);
              toast.error('No se pudo registrar el centro', 'Verificá los datos e intentá de nuevo.');
            } finally {
              setIsSaving(false);
            }
          }}
        />
      )}
    </div>
  );
}

interface PublicHubModalProps {
  onClose: () => void;
  onSubmit: (data: Omit<Centro, "inventario" | "verificacion" | "metadata">) => Promise<void>;
  isSubmitting: boolean;
}

function PublicHubModal({ onClose, onSubmit, isSubmitting }: PublicHubModalProps) {
  const [nombre, setNombre] = useState("");
  const [direccion, setDireccion] = useState("");
  const [responsable, setResponsable] = useState("");
  const [contacto, setContacto] = useState("");
  const [latitud, setLatitud] = useState("9.5832");
  const [longitud, setLongitud] = useState("-69.2216");

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
      tipo: "acopio", // Solo se permite registrar centros de acopio
      coordenadas: [lng, lat],
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4 bg-black/70 backdrop-blur-sm select-text" onClick={onClose}>
      <div
        className="relative w-full md:max-w-lg md:rounded-2xl bg-card border-t md:border border-border shadow-2xl flex flex-col max-h-[92vh] md:max-h-[85vh] animate-in slide-in-from-bottom duration-300 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera */}
        <div className="p-4 border-b border-border flex items-center justify-between bg-secondary/30">
          <div>
            <h3
              className="text-base font-black text-foreground uppercase tracking-wide leading-none"
              style={{ fontFamily: "'Barlow Condensed', sans-serif", fontStyle: "italic" }}
            >
              Proponer Centro de Acopio
            </h3>
            <p className="text-[10px] text-muted-foreground mt-1.5">
              Completa los datos del nuevo centro de acopio. Será visible de inmediato.
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-secondary hover:bg-secondary/80 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Nombre del Centro *</label>
            <input
              type="text"
              required
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="ej. Centro de Acopio Comunitario"
              className="w-full px-3 py-2 text-xs rounded-lg bg-secondary/50 border border-border text-foreground focus:outline-none focus:border-blue-500/50"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Dirección Física *</label>
            <input
              type="text"
              required
              value={direccion}
              onChange={(e) => setDireccion(e.target.value)}
              placeholder="ej. Av. Páez, frente a la Plaza Bolívar"
              className="w-full px-3 py-2 text-xs rounded-lg bg-secondary/50 border border-border text-foreground focus:outline-none focus:border-blue-500/50"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Coordinador/a *</label>
              <input
                type="text"
                required
                value={responsable}
                onChange={(e) => setResponsable(e.target.value)}
                placeholder="Nombre completo"
                className="w-full px-3 py-2 text-xs rounded-lg bg-secondary/50 border border-border text-foreground focus:outline-none focus:border-blue-500/50"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Contacto (WhatsApp) *</label>
              <input
                type="text"
                required
                value={contacto}
                onChange={(e) => setContacto(e.target.value)}
                placeholder="+58 ..."
                className="w-full px-3 py-2 text-xs rounded-lg bg-secondary/50 border border-border text-foreground focus:outline-none focus:border-blue-500/50"
              />
            </div>
          </div>

          <div className="border-t border-border/50 pt-3">
            <div className="flex justify-between items-center mb-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Coordenadas Geográficas *</label>
              <div className="text-[9px] font-mono text-blue-400 font-bold bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20 select-all">
                Lat: {parseFloat(latitud).toFixed(5)} • Lng: {parseFloat(longitud).toFixed(5)}
              </div>
            </div>

            {/* Mapa de selección */}
            <div className="w-full h-40 rounded-lg overflow-hidden border border-border relative">
              <Map
                center={[parseFloat(longitud) || -69.2216, parseFloat(latitud) || 9.5832]}
                zoom={8}
                onClick={(lngLat) => {
                  setLongitud(lngLat[0].toFixed(5));
                  setLatitud(lngLat[1].toFixed(5));
                }}
                className="w-full h-full animate-in fade-in duration-300"
              >
                <MapControls />
                <MapMarker
                  coordinates={[parseFloat(longitud) || -69.2216, parseFloat(latitud) || 9.5832]}
                  color="#3b82f6"
                  active={true}
                />
              </Map>
              <div className="absolute bottom-1.5 left-1.5 px-2 py-0.5 rounded bg-black/80 text-[8px] text-white/70 pointer-events-none">
                Hacé clic en el mapa para marcar la ubicación
              </div>
            </div>
          </div>

          <div className="p-3 bg-blue-500/5 border border-blue-500/10 rounded-lg text-[10px] text-blue-400 flex items-start gap-2">
            <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>Por motivos de seguridad, los ciudadanos no logueados solo pueden registrar centros de acopio y no centros de despacho ni destinos finales.</span>
          </div>

          {/* Botones de acción */}
          <div className="flex gap-2 pt-2 border-t border-border/50">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded-lg bg-secondary border border-border text-foreground font-bold text-xs hover:bg-secondary/80 active:scale-98 transition-[transform,background-color] duration-200 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-blue-500 text-zinc-950 font-black text-xs hover:bg-blue-600 active:scale-98 transition-[transform,background-color] duration-200 disabled:opacity-50 cursor-pointer"
              style={{ fontFamily: "'Barlow Condensed', sans-serif", fontStyle: "italic" }}
            >
              {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              REGISTRAR CENTRO
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
