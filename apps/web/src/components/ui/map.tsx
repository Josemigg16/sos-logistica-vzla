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
  /**
   * Padding (px) que MapLibre aplica al `flyTo` interno. Útil para compensar
   * elementos flotantes sobre el mapa (bottom-sheet, paneles laterales) y
   * mantener el punto centrado en el área visible real.
   */
  centerPadding?: { top?: number; bottom?: number; left?: number; right?: number };
}

const isValidLngLat = (lng: number, lat: number) => {
  return typeof lng === "number" && typeof lat === "number" && !isNaN(lng) && !isNaN(lat) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
};

export function Map({ center, zoom, theme = "dark", children, className, onClick, onMoveEnd, centerPadding }: MapProps) {
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

  // Sincronizar centro y zoom cuando cambien de forma externa
  const lastCenter = useRef<[number, number]>(center);
  const lastZoom = useRef<number>(zoom);
  const paddingRef = useRef(centerPadding);
  // Flag para distinguir flyTo programático del movimiento manual del usuario.
  // Cuando hacemos un flyTo, el `moveend` resultante reportaría el centro
  // del viewport (corrido por el `padding`), no las coords que pedimos —
  // suprimimos esa notificación para no contaminar el state externo.
  const isProgrammaticMove = useRef(false);
  useEffect(() => {
    paddingRef.current = centerPadding;
  }, [centerPadding]);
  useEffect(() => {
    if (!map) return;
    const centerChanged = lastCenter.current[0] !== center[0] || lastCenter.current[1] !== center[1];
    const zoomChanged = lastZoom.current !== zoom;
    if (!centerChanged && !zoomChanged) return;
    if (!isValidLngLat(center[0], center[1])) return;
    const padding = paddingRef.current;
    isProgrammaticMove.current = true;
    map.flyTo({
      center,
      zoom,
      duration: 1000,
      padding: padding
        ? { top: padding.top ?? 0, bottom: padding.bottom ?? 0, left: padding.left ?? 0, right: padding.right ?? 0 }
        : { top: 0, bottom: 0, left: 0, right: 0 },
    });
    lastCenter.current = center;
    lastZoom.current = zoom;
  }, [center, zoom, map]);

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
      // Si el move lo disparamos nosotros vía flyTo, no notificar al padre:
      // el padding distorsiona `map.getCenter()` y guardar ese valor
      // contaminaría el próximo flyTo. Las refs ya están sincronizadas con
      // las coords originales en el effect del flyTo.
      if (isProgrammaticMove.current) {
        isProgrammaticMove.current = false;
        return;
      }
      const c = map.getCenter();
      const z = map.getZoom();
      const newCenter: [number, number] = [c.lng, c.lat];
      // Sincronizar refs para evitar bucles o saltos de flyTo cuando el
      // usuario mueve/zoomea manualmente.
      lastCenter.current = newCenter;
      lastZoom.current = z;
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
        @keyframes user-location-ripple {
          0% { transform: scale(0.4); opacity: 0.7; }
          100% { transform: scale(2.6); opacity: 0; }
        }
        .user-location-ripple { animation: user-location-ripple 2s cubic-bezier(0.22, 1, 0.36, 1) infinite; }
        .user-location-ripple-delayed { animation: user-location-ripple 2s cubic-bezier(0.22, 1, 0.36, 1) infinite; animation-delay: 1s; }
        @keyframes user-location-dot-breathe {
          0%, 100% { transform: scale(1); box-shadow: 0 0 0 4px rgba(74, 137, 192, 0.25), 0 2px 8px rgba(0, 0, 0, 0.35); }
          50% { transform: scale(1.08); box-shadow: 0 0 0 6px rgba(74, 137, 192, 0.15), 0 2px 12px rgba(0, 0, 0, 0.4); }
        }
        .user-location-dot { animation: user-location-dot-breathe 2.4s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .needs-halo-pulse,
          .user-location-ripple,
          .user-location-ripple-delayed,
          .user-location-dot { animation: none; }
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

interface MapPickedLocationMarkerProps {
  coordinates: [number, number];
  draggable?: boolean;
  onDragEnd?: (lngLat: [number, number]) => void;
}

export function MapPickedLocationMarker({ coordinates, draggable = false, onDragEnd }: MapPickedLocationMarkerProps) {
  const { map } = useContext(MapContext);
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const onDragEndRef = useRef(onDragEnd);

  useEffect(() => {
    onDragEndRef.current = onDragEnd;
  }, [onDragEnd]);

  useEffect(() => {
    if (!map || !isValidLngLat(coordinates[0], coordinates[1])) return;

    const el = document.createElement("div");
    el.className = "relative flex items-end justify-center picked-location-marker";
    el.style.width = "40px";
    el.style.height = "52px";
    el.style.pointerEvents = draggable ? "auto" : "none";
    el.style.cursor = draggable ? "grab" : "default";
    el.style.transformOrigin = "50% 100%";
    el.style.transition = "transform 0.18s ease";
    // Pin tradicional: cabeza redonda + cola apuntando al punto. Anchor inferior.
    el.innerHTML = `
      <svg width="40" height="52" viewBox="0 0 36 48" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 4px 8px rgba(0,0,0,0.35));">
        <path d="M18 47C18 47 33 30.5 33 17.5C33 9.21573 26.2843 2.5 18 2.5C9.71573 2.5 3 9.21573 3 17.5C3 30.5 18 47 18 47Z" fill="#16a34a" stroke="#ffffff" stroke-width="2.5"/>
        <circle cx="18" cy="17.5" r="6" fill="#ffffff"/>
        <circle cx="18" cy="17.5" r="3" fill="#16a34a"/>
      </svg>
    `;

    if (draggable) {
      el.addEventListener("mouseenter", () => {
        el.style.transform = "scale(1.08)";
      });
      el.addEventListener("mouseleave", () => {
        el.style.transform = "scale(1)";
      });
    }

    const marker = new maplibregl.Marker({ element: el, anchor: "bottom", draggable })
      .setLngLat(coordinates)
      .addTo(map);

    if (draggable) {
      marker.on("dragstart", () => {
        el.style.cursor = "grabbing";
        el.style.transform = "scale(1.15)";
      });
      marker.on("dragend", () => {
        el.style.cursor = "grab";
        el.style.transform = "scale(1)";
        const lngLat = marker.getLngLat();
        onDragEndRef.current?.([lngLat.lng, lngLat.lat]);
      });
    }

    markerRef.current = marker;

    return () => {
      try {
        marker.remove();
      } catch (err) {
        console.warn("Error removing picked-location marker:", err);
      }
      markerRef.current = null;
    };
  }, [map, draggable]);

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

interface MapUserLocationMarkerProps {
  coordinates: [number, number];
}

export function MapUserLocationMarker({ coordinates }: MapUserLocationMarkerProps) {
  const { map } = useContext(MapContext);
  const markerRef = useRef<maplibregl.Marker | null>(null);

  useEffect(() => {
    if (!map || !isValidLngLat(coordinates[0], coordinates[1])) return;

    const el = document.createElement("div");
    el.className = "relative flex items-center justify-center";
    el.style.width = "56px";
    el.style.height = "56px";
    el.style.pointerEvents = "none";

    // Onda expansiva — pulso radial estilo "estoy aquí"
    const ripple = document.createElement("div");
    ripple.className = "absolute rounded-full user-location-ripple";
    ripple.style.width = "56px";
    ripple.style.height = "56px";
    ripple.style.backgroundColor = "rgba(74, 137, 192, 0.45)";
    el.appendChild(ripple);

    // Segunda onda desfasada para ritmo continuo
    const rippleDelayed = document.createElement("div");
    rippleDelayed.className = "absolute rounded-full user-location-ripple-delayed";
    rippleDelayed.style.width = "56px";
    rippleDelayed.style.height = "56px";
    rippleDelayed.style.backgroundColor = "rgba(74, 137, 192, 0.45)";
    el.appendChild(rippleDelayed);

    // Anillo blanco — separa visualmente del fondo del mapa
    const ring = document.createElement("div");
    ring.className = "absolute rounded-full";
    ring.style.width = "26px";
    ring.style.height = "26px";
    ring.style.backgroundColor = "#ffffff";
    ring.style.boxShadow = "0 2px 6px rgba(0, 0, 0, 0.3)";
    el.appendChild(ring);

    // Punto azul central — corazón del marcador
    const dot = document.createElement("div");
    dot.className = "absolute rounded-full user-location-dot";
    dot.style.width = "18px";
    dot.style.height = "18px";
    dot.style.background = "radial-gradient(circle at 30% 30%, #6BA3D4 0%, #2B5F8E 70%, #1E4A6E 100%)";
    el.appendChild(dot);

    const marker = new maplibregl.Marker({ element: el })
      .setLngLat(coordinates)
      .addTo(map);

    markerRef.current = marker;

    return () => {
      try {
        marker.remove();
      } catch (err) {
        console.warn("Error removing user-location marker:", err);
      }
      markerRef.current = null;
    };
  }, [map]);

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

interface MapDisasterZoneProps {
  coordinates: [number, number];
  color?: string;
  label: string;
  radiusPx?: number;
}

export function MapDisasterZone({
  coordinates,
  color = "#ef4444",
  label,
  radiusPx = 80,
}: MapDisasterZoneProps) {
  const { map } = useContext(MapContext);
  const markerRef = useRef<maplibregl.Marker | null>(null);

  useEffect(() => {
    if (!map || !isValidLngLat(coordinates[0], coordinates[1])) return;

    const el = document.createElement("div");
    el.className = "relative flex items-center justify-center pointer-events-none";
    el.style.width = `${radiusPx}px`;
    el.style.height = `${radiusPx}px`;

    // Área translúcida pulsante
    const area = document.createElement("div");
    area.className = "absolute rounded-full opacity-20 animate-pulse";
    area.style.width = "100%";
    area.style.height = "100%";
    area.style.backgroundColor = color;
    area.style.border = `2px dashed ${color}`;
    el.appendChild(area);

    // Núcleo brillante
    const core = document.createElement("div");
    core.className = "absolute rounded-full w-3.5 h-3.5 shadow-lg";
    core.style.backgroundColor = color;
    core.style.boxShadow = `0 0 16px ${color}`;
    el.appendChild(core);

    // Etiqueta de texto
    const text = document.createElement("div");
    text.className = "absolute top-full mt-2 px-2 py-1 rounded bg-black/85 border border-white/10 text-white text-[9px] font-black tracking-wider uppercase text-center whitespace-nowrap shadow-md select-none pointer-events-auto cursor-pointer";
    text.style.fontFamily = "'Barlow Condensed', sans-serif";
    text.style.fontStyle = "italic";
    text.innerText = label;
    el.appendChild(text);

    const marker = new maplibregl.Marker({ element: el })
      .setLngLat(coordinates)
      .addTo(map);

    markerRef.current = marker;

    return () => {
      try {
        marker.remove();
      } catch (err) {
        console.warn("Error removing disaster zone marker:", err);
      }
      markerRef.current = null;
    };
  }, [map, color, label, radiusPx]);

  return null;
}


