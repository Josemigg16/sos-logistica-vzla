import { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import type { HubNeed, PublicConvoy, PublicIncident } from "@sos/shared";
import { useAuth } from "@/lib/auth/auth-context";
import { useToast } from "@/components/ui/toast";
import { API_URL } from "@/lib/auth/config";
import { signupHub, AuthError } from "@/lib/auth/auth-client";
import { getToken } from "@/lib/auth/token-store";
import centrosData from "@/data/centros.json";
import { fetchPublicIncidents, getKmDistance } from "@/lib/map/mapViewerHelpers";
import { CENTRO_TYPES } from "@/lib/map/mapViewerConstants";
import type { Centro } from "@/lib/map/mapViewerConstants";

export interface Necesidad {
  id: string;
  nombre: string;
  categoria: string;
  unidad: string;
  meta: number;
  recibido: number;
  prioridad: "CRITICA" | "ALTA" | "MEDIA" | "BAJA";
  descripcion: string;
  ultimaActualizacion: string;
  fechaNecesidad: string;
  hubId?: string;
}

export interface GeneratedCredentials {
  telefono: string;
  password: string;
}

export function UseMapViewer() {
  const { loginWithToken, user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [theme, setTheme] = useState<"light" | "dark">(() => {
    const saved = localStorage.getItem("theme");
    if (saved === "light" || saved === "dark") return saved;
    return "dark";
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

  const { data: incidents = [] } = useQuery({
    queryKey: ["incidents"],
    queryFn: fetchPublicIncidents,
  });

  const visibleIncidents = useMemo(
    () => incidents.filter((i) => i.status === "ACTIVE" || i.status === "CONTAINED"),
    [incidents]
  );

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTipos, setActiveTipos] = useState<Set<Centro["tipo"]>>(
    () => new Set<Centro["tipo"]>(CENTRO_TYPES)
  );
  const [showSupplyRoute, setShowSupplyRoute] = useState(false);
  const [activeImageUrl, setActiveImageUrl] = useState<string | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [clickedCoordinates, setClickedCoordinates] = useState<[number, number] | null>(null);
  const [useCurrentLocation, setUseCurrentLocation] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hubFieldErrors, setHubFieldErrors] = useState<Record<string, string | undefined>>({});
  const [hubFormError, setHubFormError] = useState<string | null>(null);
  const [generatedCredentials, setGeneratedCredentials] = useState<GeneratedCredentials | null>(null);
  const [activeConvoys, setActiveConvoys] = useState<PublicConvoy[]>([]);
  const [showNeedsPanel, setShowNeedsPanel] = useState(false);
  const [showFiltersPopover, setShowFiltersPopover] = useState(false);
  const [needs, setNeeds] = useState<Necesidad[]>([]);
  const [isLoadingNeeds, setIsLoadingNeeds] = useState(false);
  const [showDrawerNeeds, setShowDrawerNeeds] = useState(false);
  const [groupNeedsBy, setGroupNeedsBy] = useState<"none" | "centro">("centro");

  const [showWelcomeModal, setShowWelcomeModal] = useState(() => {
    const fromLandingCta = localStorage.getItem("map_intro_force") === "1";
    if (fromLandingCta) {
      localStorage.removeItem("map_intro_force");
      return true;
    }
    return !localStorage.getItem("map_welcome_seen");
  });

  useEffect(() => {
    setShowDrawerNeeds(false);
  }, [selectedId]);

  const handleMapClick = (lngLat: [number, number]) => {
    setClickedCoordinates(lngLat);
    setUseCurrentLocation(false);
    setSelectedId(null);
    setSelectedIncidentId(null);
  };

  const routeCoordinates = useMemo<[number, number][]>(() => {
    const p1 = centros.find((c) => c.id === "3")?.coordenadas || [-67.6053, 10.2442];
    const p2 = centros.find((c) => c.id === "2")?.coordenadas || [-68.0044, 10.1804];
    const p3 = centros.find((c) => c.id === "4")?.coordenadas || [-69.3136, 10.0678];
    return [p1, p2, p3];
  }, [centros]);

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
        .then((data: any) => {
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

  useEffect(() => {
    setIsLoadingNeeds(true);
    fetch(`${API_URL}/needs`)
      .then((res) => {
        if (!res.ok) throw new Error("API response not OK");
        return res.json();
      })
      .then((data) => {
        const priorityOrder = { CRITICA: 0, ALTA: 1, MEDIA: 2, BAJA: 3 };
        const sorted = data.sort((a: any, b: any) => {
          const pA = priorityOrder[a.prioridad as keyof typeof priorityOrder] ?? 99;
          const pB = priorityOrder[b.prioridad as keyof typeof priorityOrder] ?? 99;
          if (pA !== pB) return pA - pB;
          return new Date(a.fechaNecesidad).getTime() - new Date(b.fechaNecesidad).getTime();
        });
        setNeeds(sorted);
      })
      .catch((err) => {
        console.warn("No se pudieron cargar las necesidades:", err);
      })
      .finally(() => {
        setIsLoadingNeeds(false);
      });
  }, []);

  const selectedCentro = useMemo(() => {
    return centros.find((c) => c.id === selectedId) || null;
  }, [selectedId, centros]);

  const selectedIncident = useMemo(() => {
    return visibleIncidents.find((incident) => incident.id === selectedIncidentId) || null;
  }, [selectedIncidentId, visibleIncidents]);

  const generalNeedsIncident = useMemo(() => {
    return (
      visibleIncidents.find((incident) => {
        const text = `${incident.title} ${incident.type}`.toLowerCase();
        return text.includes("terremoto");
      }) ?? visibleIncidents[0] ?? null
    );
  }, [visibleIncidents]);

  const centroNeeds = useMemo(() => {
    if (!selectedCentro) return [];
    return needs.filter((n) => n.hubId === selectedCentro.id);
  }, [selectedCentro, needs]);

  const [mapCenter, setMapCenter] = useState<[number, number]>(() => {
    const saved = localStorage.getItem("map_center");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return [-68.65, 10.05];
  });

  const [mapZoom, setMapZoom] = useState<number>(() => {
    const saved = localStorage.getItem("map_zoom");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return 8;
  });

  const [userLocation, setUserLocation] = useState<[number, number] | null>(() => {
    const saved = localStorage.getItem("user_location");
    if (!saved) return null;
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length === 2 && typeof parsed[0] === "number" && typeof parsed[1] === "number") {
        return parsed as [number, number];
      }
    } catch {}
    return null;
  });

  const sortedNeeds = useMemo(() => {
    const priorityOrder = { CRITICA: 0, ALTA: 1, MEDIA: 2, BAJA: 3 };

    return [...needs].sort((a, b) => {
      if (userLocation) {
        const centroA = centros.find((c) => c.id === a.hubId);
        const centroB = centros.find((c) => c.id === b.hubId);

        if (centroA && centroB) {
          const distA = getKmDistance(userLocation, centroA.coordenadas);
          const distB = getKmDistance(userLocation, centroB.coordenadas);
          return distA - distB;
        }
      }

      const pA = priorityOrder[a.prioridad as keyof typeof priorityOrder] ?? 99;
      const pB = priorityOrder[b.prioridad as keyof typeof priorityOrder] ?? 99;
      if (pA !== pB) return pA - pB;
      return new Date(a.fechaNecesidad).getTime() - new Date(b.fechaNecesidad).getTime();
    });
  }, [needs, userLocation, centros]);

  const groupedNeedsByCentro = useMemo(() => {
    const groups: Record<
      string,
      {
        centro: Centro;
        needs: Necesidad[];
        maxPriority: string;
        distance?: number;
        incident?: PublicIncident;
        isGeneralEmergency?: boolean;
      }
    > = {};

    for (const n of sortedNeeds) {
      const isGeneralEmergency = !n.hubId;
      const hubId = n.hubId || "general-emergency";
      if (!groups[hubId]) {
        const existingCentro = centros.find((c) => c.id === hubId);
        const centro: Centro = existingCentro || {
          id: hubId,
          nombre: isGeneralEmergency
            ? generalNeedsIncident
              ? `Emergencia: ${generalNeedsIncident.title}`
              : "Necesidades generales de emergencia"
            : "Centro Desconocido",
          direccion: isGeneralEmergency
            ? generalNeedsIncident?.zone ?? "Necesidades no asociadas a un centro específico"
            : "Dirección no disponible",
          contacto: "",
          responsable: "",
          coordenadas:
            isGeneralEmergency && generalNeedsIncident
              ? [generalNeedsIncident.longitude, generalNeedsIncident.latitude]
              : [0, 0],
          tipo: "acopio" as const,
          inventario: {},
        };
        const distance =
          userLocation && existingCentro ? getKmDistance(userLocation, existingCentro.coordenadas) : undefined;
        groups[hubId] = {
          centro,
          needs: [],
          maxPriority: n.prioridad,
          distance,
          incident: isGeneralEmergency ? generalNeedsIncident ?? undefined : undefined,
          isGeneralEmergency,
        };
      }
      groups[hubId].needs.push(n);

      const priorityOrder = { CRITICA: 0, ALTA: 1, MEDIA: 2, BAJA: 3 };
      const currentMax = priorityOrder[groups[hubId].maxPriority as keyof typeof priorityOrder] ?? 99;
      const thisPriority = priorityOrder[n.prioridad as keyof typeof priorityOrder] ?? 99;
      if (thisPriority < currentMax) {
        groups[hubId].maxPriority = n.prioridad;
      }
    }

    return Object.values(groups).sort((a, b) => {
      if (a.distance !== undefined && b.distance !== undefined) {
        return a.distance - b.distance;
      }
      const priorityOrder = { CRITICA: 0, ALTA: 1, MEDIA: 2, BAJA: 3 };
      const pA = priorityOrder[a.maxPriority as keyof typeof priorityOrder] ?? 99;
      const pB = priorityOrder[b.maxPriority as keyof typeof priorityOrder] ?? 99;
      return pA - pB;
    });
  }, [sortedNeeds, centros, userLocation, generalNeedsIncident]);

  const hasCenteredOnUserRef = useRef(false);

  useEffect(() => {
    localStorage.setItem("has_entered_map", "true");
    if (!navigator.geolocation) return;

    const handleSuccess = (position: GeolocationPosition) => {
      const coords: [number, number] = [position.coords.longitude, position.coords.latitude];
      setUserLocation(coords);
      localStorage.setItem("user_location", JSON.stringify(coords));
      if (!hasCenteredOnUserRef.current) {
        hasCenteredOnUserRef.current = true;
        setMapCenter(coords);
        setMapZoom(8);
      }
    };
    const handleError = () => {};

    const watchId = navigator.geolocation.watchPosition(handleSuccess, handleError, {
      enableHighAccuracy: true,
      maximumAge: 30_000,
      timeout: 27_000,
    });

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  const publicCentros = useMemo(() => centros.filter((c) => c.estado !== "INACTIVO"), [centros]);

  const filteredCentros = useMemo(() => {
    const normalize = (s: string) =>
      s
        .toLowerCase()
        .normalize("NFD")
        .replace(/\p{Mn}/gu, "");
    const term = normalize(searchTerm);
    return publicCentros.filter(
      (c) =>
        activeTipos.has(c.tipo) &&
        (normalize(c.nombre).includes(term) || normalize(c.direccion).includes(term))
    );
  }, [publicCentros, searchTerm, activeTipos]);

  const toggleTipo = (tipo: Centro["tipo"]) => {
    setActiveTipos((prev) => {
      const next = new Set(prev);
      if (next.has(tipo)) {
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
    setSelectedIncidentId(null);
    setMapCenter(centro.coordenadas);
    setMapZoom(11);
    setIsRegistering(false);
    setClickedCoordinates(null);
    setShowNeedsPanel(false);
  };

  const handleRegisterHubSubmit = async (data: any) => {
    setIsSaving(true);
    setHubFieldErrors({});
    setHubFormError(null);
    try {
      let signupResult: any = null;
      if (!user) {
        try {
          signupResult = await signupHub(data.contacto, {
            cedula: data.cedula,
            documentType: data.documentType,
          });
          loginWithToken(signupResult.accessToken, signupResult.user);
        } catch (signupErr) {
          if (signupErr instanceof AuthError) {
            if (signupErr.code === "USERNAME_TAKEN") {
              setHubFieldErrors({ contacto: signupErr.message });
            } else if (signupErr.code === "CEDULA_TAKEN") {
              setHubFieldErrors({ cedula: signupErr.message });
            } else {
              setHubFormError(signupErr.message);
            }
          } else {
            setHubFormError("No se pudo crear la cuenta. Verifica tu número e intenta de nuevo.");
          }
          return;
        }
      }

      const token = signupResult?.accessToken ?? getToken();
      const headers: HeadersInit = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`${API_URL}/centros`, {
        method: "POST",
        headers,
        body: JSON.stringify({ ...data, estado: "INACTIVO", inventario: {} }),
      });
      if (!res.ok) throw new Error("Fallo al guardar");

      const listRes = await fetch(`${API_URL}/centros`);
      if (listRes.ok) setCentros(await listRes.json());

      setIsRegistering(false);
      setClickedCoordinates(null);
      setUseCurrentLocation(false);

      if (user) {
        navigate({ to: "/admin/hubs" });
      } else if (signupResult?.generatedPassword) {
        setGeneratedCredentials({ telefono: data.contacto, password: signupResult.generatedPassword });
      } else {
        navigate({ to: "/admin/hubs" });
      }
    } catch (err) {
      console.error(err);
      toast.error("No se pudo registrar el centro", "Verifica los datos e intenta de nuevo.");
    } finally {
      setIsSaving(false);
    }
  };

  return {
    theme,
    setTheme,
    centros,
    setCentros,
    visibleIncidents,
    selectedId,
    setSelectedId,
    selectedIncidentId,
    setSelectedIncidentId,
    searchTerm,
    setSearchTerm,
    activeTipos,
    setActiveTipos,
    showSupplyRoute,
    setShowSupplyRoute,
    activeImageUrl,
    setActiveImageUrl,
    isRegistering,
    setIsRegistering,
    clickedCoordinates,
    setClickedCoordinates,
    useCurrentLocation,
    setUseCurrentLocation,
    isSaving,
    hubFieldErrors,
    setHubFieldErrors,
    hubFormError,
    setHubFormError,
    generatedCredentials,
    setGeneratedCredentials,
    activeConvoys,
    showNeedsPanel,
    setShowNeedsPanel,
    showFiltersPopover,
    setShowFiltersPopover,
    needs,
    isLoadingNeeds,
    showDrawerNeeds,
    setShowDrawerNeeds,
    groupNeedsBy,
    setGroupNeedsBy,
    showWelcomeModal,
    setShowWelcomeModal,
    handleMapClick,
    routeCoordinates,
    selectedCentro,
    selectedIncident,
    generalNeedsIncident,
    centroNeeds,
    mapCenter,
    setMapCenter,
    mapZoom,
    setMapZoom,
    userLocation,
    sortedNeeds,
    groupedNeedsByCentro,
    filteredCentros,
    toggleTipo,
    handleSelectCentro,
    handleRegisterHubSubmit,
    user,
    navigate,
    toast,
  };
}
