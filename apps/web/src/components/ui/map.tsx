import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

const MapContext = createContext<{ map: maplibregl.Map | null }>({ map: null });

interface MapProps {
  center: [number, number];
  zoom: number;
  theme?: "light" | "dark";
  children?: React.ReactNode;
  className?: string;
}

export function Map({ center, zoom, theme = "dark", children, className }: MapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<maplibregl.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const styleUrl = theme === "dark"
      ? "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
      : "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";

    const mapInstance = new maplibregl.Map({
      container: containerRef.current,
      style: styleUrl,
      center: center,
      zoom: zoom,
      attributionControl: false,
    });

    mapInstance.on("load", () => {
      setMap(mapInstance);
      // Habilitar resize automático al cambiar tamaño de pantalla
      setTimeout(() => mapInstance.resize(), 100);
    });

    return () => {
      mapInstance.remove();
    };
  }, []);

  // Cambiar el estilo de mapa al cambiar el tema
  useEffect(() => {
    if (!map) return;
    const styleUrl = theme === "dark"
      ? "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
      : "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";
    map.setStyle(styleUrl);
  }, [theme, map]);

  // Sincronizar centro cuando cambie de forma externa
  const lastCenter = useRef<[number, number]>(center);
  useEffect(() => {
    if (!map) return;
    if (lastCenter.current[0] !== center[0] || lastCenter.current[1] !== center[1]) {
      map.flyTo({ center, duration: 1000 });
      lastCenter.current = center;
    }
  }, [center, map]);

  return (
    <div ref={containerRef} className={className} style={{ width: "100%", height: "100%", position: "relative" }}>
      <MapContext.Provider value={{ map }}>
        {map && children}
      </MapContext.Provider>
    </div>
  );
}

export function MapControls() {
  const { map } = useContext(MapContext);

  useEffect(() => {
    if (!map) return;
    const nav = new maplibregl.NavigationControl({ showCompass: false });
    map.addControl(nav, "top-right");
    return () => {
      map.removeControl(nav);
    };
  }, [map]);

  return null;
}

interface MapMarkerProps {
  coordinates: [number, number];
  onClick?: () => void;
  color?: string;
  active?: boolean;
}

export function MapMarker({ coordinates, onClick, color = "#22c55e", active = false }: MapMarkerProps) {
  const { map } = useContext(MapContext);
  const markerRef = useRef<maplibregl.Marker | null>(null);

  useEffect(() => {
    if (!map) return;

    // Crear un elemento HTML personalizado para el marcador con animación de pulso
    const el = document.createElement("div");
    el.className = "relative flex items-center justify-center cursor-pointer";
    el.style.width = active ? "32px" : "24px";
    el.style.height = active ? "32px" : "24px";
    el.style.transition = "all 0.3s ease";

    // Efecto de pulso
    const pulse = document.createElement("div");
    pulse.className = "absolute rounded-full animate-ping opacity-75";
    pulse.style.backgroundColor = color;
    pulse.style.width = active ? "100%" : "80%";
    pulse.style.height = active ? "100%" : "80%";

    // Punto central
    const dot = document.createElement("div");
    dot.className = "rounded-full shadow-lg border border-white/20 transition-all duration-300";
    dot.style.backgroundColor = color;
    dot.style.width = active ? "16px" : "12px";
    dot.style.height = active ? "16px" : "12px";
    if (active) {
      dot.style.transform = "scale(1.2)";
      dot.style.boxShadow = `0 0 12px ${color}`;
    }

    el.appendChild(pulse);
    el.appendChild(dot);

    const marker = new maplibregl.Marker({
      element: el,
    })
      .setLngLat(coordinates)
      .addTo(map);

    if (onClick) {
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        onClick();
      });
    }

    markerRef.current = marker;

    return () => {
      marker.remove();
    };
  }, [map, coordinates, color, onClick, active]);

  return null;
}
