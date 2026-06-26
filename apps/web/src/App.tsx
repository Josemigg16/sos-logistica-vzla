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
  Moon
} from "lucide-react";
import { Map, MapControls, MapMarker } from "@/components/ui/map";
import centrosData from "@/data/centros.json";

interface Centro {
  id: string;
  nombre: string;
  direccion: string;
  contacto: string;
  responsable: string;
  coordenadas: [number, number];
  tipo: "acopio" | "salida" | "destino";
  inventario: Record<string, number>;
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

  const [centros, setCentros] = useState<Centro[]>(centrosData as Centro[]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string | null>(null);
  const [isDetailsExpanded, setIsDetailsExpanded] = useState(false);

  useEffect(() => {
    fetch("http://localhost:3000/api/centros")
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
        <div className="flex items-center gap-3">
          <img
            src="/src/assets/branding/white-isotipo-blue-background.webp"
            alt="Portuguesa Unida"
            className="w-10 h-10 rounded-lg object-cover"
          />
          <div>
            <h1
              className="text-sm font-black text-foreground m-0 leading-none tracking-wide"
              style={{ fontFamily: "'Barlow Condensed', sans-serif", fontStyle: 'italic' }}
            >
              PORTUGUESA UNIDA
            </h1>
            <p className="text-[10px] text-muted-foreground mt-0.5 leading-none font-medium">Centros de Acopio</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="flex items-center justify-center w-8 h-8 rounded-lg bg-secondary/80 border border-border text-foreground hover:bg-secondary transition-transform transition-colors duration-200 active:scale-[0.96] cursor-pointer"
            title="Cambiar tema"
          >
            {theme === "dark" ? <Sun className="w-4 h-4 text-blue-300" /> : <Moon className="w-4 h-4 text-blue-700" />}
          </button>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 text-[10px] font-semibold border border-blue-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping"></span>
            Público
          </div>
        </div>
      </header>

      {/* MAPA PRINCIPAL */}
      <main className="w-full h-full z-10 relative">
        <Map center={mapCenter} zoom={mapZoom} theme={theme} className="w-full h-full">
          <MapControls />
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
                <div className="flex items-center gap-1.5 mt-1 text-muted-foreground">
                  <MapPin className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400 shrink-0" />
                  <p className="text-[11px] font-medium leading-none">{selectedCentro.direccion}</p>
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
            <div className={`flex-1 overflow-y-auto mt-4 pr-1 no-scrollbar ${isDetailsExpanded ? "block" : "hidden md:block"}`}>
              
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

              {/* Nota de actualización */}
              <div className="flex items-center gap-2 mt-5 p-3 rounded-lg bg-background/20 border border-border/50 text-muted-foreground text-[10px]">
                <Info className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <span className="text-pretty">Esta información es actualizada en tiempo real por el equipo de SOS Logística desde el centro de control.</span>
              </div>
            </div>
            
          </div>
        )}
      </div>
    </div>
  );
}
