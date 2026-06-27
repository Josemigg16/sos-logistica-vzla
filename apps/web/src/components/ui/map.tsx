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
  onClick?: (lngLat: [number, number]) => void;
  onMoveEnd?: (center: [number, number], zoom: number) => void;
}

const isValidLngLat = (lng: number, lat: number) => {
  return typeof lng === "number" && typeof lat === "number" && !isNaN(lng) && !isNaN(lat) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
};

export function Map({ center, zoom, theme = "dark", children, className, onClick, onMoveEnd }: MapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<maplibregl.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const styleUrl = theme === "dark"
      ? "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
      : "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";

    const safeCenter: [number, number] = isValidLngLat(center[0], center[1])
      ? center
      : [-69.2216, 9.5832];

    const mapInstance = new maplibregl.Map({
      container: containerRef.current,
      style: styleUrl,
      center: safeCenter,
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
      if (isValidLngLat(center[0], center[1])) {
        map.flyTo({ center, duration: 1000 });
        lastCenter.current = center;
      }
    }
  }, [center, map]);

  // Escuchar clics en el mapa
  const onClickRef = useRef(onClick);
  useEffect(() => {
    onClickRef.current = onClick;
  }, [onClick]);

  useEffect(() => {
    if (!map) return;
    let clickTimeout: any = null;

    const handleMapClick = (e: maplibregl.MapMouseEvent) => {
      if (!onClickRef.current) return;
      
      if (clickTimeout) {
        clearTimeout(clickTimeout);
        clickTimeout = null;
        return;
      }

      clickTimeout = setTimeout(() => {
        onClickRef.current?.([e.lngLat.lng, e.lngLat.lat]);
        clickTimeout = null;
      }, 250);
    };

    map.on("click", handleMapClick);
    return () => {
      if (clickTimeout) clearTimeout(clickTimeout);
      try {
        if (map && typeof map.off === "function") {
          map.off("click", handleMapClick);
        }
      } catch (err) {
        console.warn("Error removing click listener:", err);
      }
    };
  }, [map]);

  // Escuchar movimiento/zoom del mapa
  const onMoveEndRef = useRef(onMoveEnd);
  useEffect(() => {
    onMoveEndRef.current = onMoveEnd;
  }, [onMoveEnd]);

  useEffect(() => {
    if (!map || !onMoveEnd) return;
    const handleMoveEnd = () => {
      const c = map.getCenter();
      const z = map.getZoom();
      const newCenter: [number, number] = [c.lng, c.lat];
      lastCenter.current = newCenter; // Sincronizar lastCenter para evitar bucles o saltos de flyTo
      onMoveEndRef.current?.(newCenter, z);
    };
    map.on("moveend", handleMoveEnd);
    return () => {
      try {
        if (map && typeof map.off === "function") {
          map.off("moveend", handleMoveEnd);
        }
      } catch (err) {
        console.warn("Error removing moveend listener:", err);
      }
    };
  }, [map, onMoveEnd]);


  return (
    <div ref={containerRef} className={className} style={{ width: "100%", height: "100%", position: "relative" }}>
      <MapContext.Provider value={{ map }}>
        {map && children}
      </MapContext.Provider>
      <style>{`
        @keyframes needs-halo-pulse {
          0%, 100% { transform: scale(1); opacity: 0.9; }
          50% { transform: scale(1.15); opacity: 0.35; }
        }
        .needs-halo-pulse { animation: needs-halo-pulse 1.6s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .needs-halo-pulse { animation: none; }
        }
      `}</style>
    </div>
  );
}

export function MapControls() {
  const { map } = useContext(MapContext);

  useEffect(() => {
    if (!map) return;
    const nav = new maplibregl.NavigationControl({ showCompass: false });
    map.addControl(nav, "top-right");

    const geolocate = new maplibregl.GeolocateControl({
      positionOptions: {
        enableHighAccuracy: true,
      },
      trackUserLocation: true,
      showUserLocation: true,
    });
    map.addControl(geolocate, "top-right");

    return () => {
      try {
        if (map && typeof map.removeControl === "function") {
          map.removeControl(nav);
          map.removeControl(geolocate);
        }
      } catch (err) {
        console.warn("Error removing control:", err);
      }
    };
  }, [map]);

  return null;
}

interface MapMarkerProps {
  coordinates: [number, number];
  onClick?: () => void;
  color?: string;
  active?: boolean;
  draggable?: boolean;
  onDragEnd?: (lngLat: [number, number]) => void;
  /** Si true: agrega un anillo dorado pulsante encima — señal "este centro tiene necesidades". */
  hasNeeds?: boolean;
}

export function MapMarker({
  coordinates,
  onClick,
  color = "#22c55e",
  active = false,
  draggable = false,
  onDragEnd,
  hasNeeds = false,
}: MapMarkerProps) {
  const { map } = useContext(MapContext);
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const onClickRef = useRef(onClick);
  const onDragEndRef = useRef(onDragEnd);

  useEffect(() => {
    onClickRef.current = onClick;
    onDragEndRef.current = onDragEnd;
  }, [onClick, onDragEnd]);

  useEffect(() => {
    if (!map || !isValidLngLat(coordinates[0], coordinates[1])) return;

    // Crear un elemento HTML personalizado para el marcador con animación de pulso
    const el = document.createElement("div");
    el.className = "relative flex items-center justify-center cursor-pointer";
    // Si hay necesidades, el contenedor crece para alojar el halo dorado.
    const sizePx = hasNeeds ? (active ? 44 : 36) : (active ? 32 : 24);
    el.style.width = `${sizePx}px`;
    el.style.height = `${sizePx}px`;
    // Transicionar SOLO tamaño — nunca 'all', porque MapLibre posiciona el
    // marcador vía transform y un transition: all lo haría arrastrarse con
    // delay detrás del mapa al moverse.
    el.style.transition = "width 0.3s ease, height 0.3s ease";

    // Halo dorado pulsante — sólo cuando el centro tiene necesidades activas.
    // Va detrás del pulso de color para que el tipo del centro siga siendo legible.
    if (hasNeeds) {
      const needsHalo = document.createElement("div");
      needsHalo.className = "absolute rounded-full needs-halo-pulse";
      needsHalo.style.width = "100%";
      needsHalo.style.height = "100%";
      needsHalo.style.border = "2px solid #fbbf24";
      needsHalo.style.boxShadow = "0 0 14px rgba(251, 191, 36, 0.7)";
      el.appendChild(needsHalo);
    }

    // Efecto de pulso del color por tipo
    const pulse = document.createElement("div");
    pulse.className = "absolute rounded-full animate-ping opacity-75";
    pulse.style.backgroundColor = color;
    const innerPct = hasNeeds ? (active ? "70%" : "60%") : (active ? "100%" : "80%");
    pulse.style.width = innerPct;
    pulse.style.height = innerPct;

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
      draggable: draggable,
    })
      .setLngLat(coordinates)
      .addTo(map);

    el.addEventListener("click", (e) => {
      e.stopPropagation();
      onClickRef.current?.();
    });

    if (draggable) {
      marker.on("dragend", () => {
        const lngLat = marker.getLngLat();
        onDragEndRef.current?.([lngLat.lng, lngLat.lat]);
      });
    }

    markerRef.current = marker;

    return () => {
      try {
        marker.remove();
      } catch (err) {
        console.warn("Error removing marker:", err);
      }
      markerRef.current = null;
    };
  }, [map, color, active, draggable, hasNeeds]);

  // Sincronizar posición sin recrear el marcador
  useEffect(() => {
    if (markerRef.current && isValidLngLat(coordinates[0], coordinates[1])) {
      const currentLngLat = markerRef.current.getLngLat();
      if (currentLngLat.lng !== coordinates[0] || currentLngLat.lat !== coordinates[1]) {
        markerRef.current.setLngLat(coordinates);
      }
    }
  }, [coordinates]);

  return null;
}

interface MapRouteProps {
  coordinates: [number, number][];
  color?: string;
}

export function MapRoute({ coordinates, color = "#10b981" }: MapRouteProps) {
  const { map } = useContext(MapContext);

  useEffect(() => {
    const validCoords = coordinates.filter(c => isValidLngLat(c[0], c[1]));
    if (!map || validCoords.length < 2) return;

    let isMounted = true;
    let geometryData: any = null;
    const sourceId = "intelligent-route-source";
    const layerId = "intelligent-route-layer";

    const drawRoute = () => {
      if (!map || !geometryData) return;

      try {
        if (map.getLayer(layerId)) map.removeLayer(layerId);
        if (map.getSource(sourceId)) map.removeSource(sourceId);

        map.addSource(sourceId, {
          type: "geojson",
          data: {
            type: "Feature",
            properties: {},
            geometry: geometryData,
          },
        });

        map.addLayer({
          id: layerId,
          type: "line",
          source: sourceId,
          layout: {
            "line-join": "round",
            "line-cap": "round",
          },
          paint: {
            "line-color": color,
            "line-width": 5.5,
            "line-opacity": 0.85,
          },
        });
      } catch (err) {
        console.error("Error drawing route layer:", err);
      }
    };

    const fetchRoute = async () => {
      try {
        const coordsString = validCoords.map((c) => `${c[0]},${c[1]}`).join(";");
        const url = `https://router.project-osrm.org/route/v1/driving/${coordsString}?geometries=geojson&overview=full`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("Error fetching route from OSRM");
        const data = await res.json();
        
        if (!isMounted) return;

        if (data.routes && data.routes.length > 0) {
          geometryData = data.routes[0].geometry;
          drawRoute();
        }
      } catch (err) {
        console.error("Error fetching OSRM route:", err);
      }
    };

    const onStyleData = () => {
      if (geometryData && !map.getSource(sourceId)) {
        drawRoute();
      }
    };

    fetchRoute();
    map.on("styledata", onStyleData);

    return () => {
      isMounted = false;
      try {
        if (map && typeof map.off === "function") {
          map.off("styledata", onStyleData);
        }
      } catch (err) {
        console.warn("Error removing styledata listener:", err);
      }
      try {
        if (map && typeof map.getLayer === "function" && map.getLayer(layerId)) {
          map.removeLayer(layerId);
        }
        if (map && typeof map.getSource === "function" && map.getSource(sourceId)) {
          map.removeSource(sourceId);
        }
      } catch (err) {
        console.warn("Error cleaning up route source/layer:", err);
      }
    };
  }, [map, coordinates, color]);

  return null;
}

