import type { PriorityName, PublicIncident, HubNeedType } from "@sos/shared";

export interface Centro {
  id: string;
  nombre: string;
  direccion: string;
  contacto: string;
  responsable: string;
  coordenadas: [number, number];
  tipo: "acopio" | "salida" | "destino" | "refugio";
  estado?: "ACTIVO" | "INACTIVO";
  inventario: Record<string, number>;
  isInformal?: boolean;
  needs?: any[]; // HubNeed type compatible
  verificacion?: {
    imagenes: string[];
    fecha: string;
    operario: string;
    novedades?: string;
  };
}

export const INCIDENT_PRIORITY_LABELS: Record<PriorityName, string> = {
  CRITICAL: "Crítica",
  HIGH: "Alta",
  MEDIUM: "Media",
  LOW: "Baja",
};

export const INCIDENT_STATUS_LABELS: Record<PublicIncident["status"], string> = {
  ACTIVE: "Activa",
  CONTAINED: "Contenida",
  CLOSED: "Cerrada",
};

export const CENTRO_TYPES = ["acopio", "salida", "destino", "refugio"] as const satisfies readonly Centro["tipo"][];

export const CENTRO_TYPE_UI: Record<Centro["tipo"], {
  label: string;
  marker: string;
  dot: string;
  glow: string;
  legendTitle: string;
  legendDescription: string;
}> = {
  acopio: {
    label: "Centro de Acopio Local",
    marker: "#3b82f6",
    dot: "bg-blue-500",
    glow: "shadow-[0_0_8px_rgba(59,130,246,0.6)]",
    legendTitle: "Acopio",
    legendDescription: "Puntos donde la comunidad entrega donaciones y suministros.",
  },
  salida: {
    label: "Salidas ZODI",
    marker: "#ef4444",
    dot: "bg-red-500",
    glow: "shadow-[0_0_8px_rgba(239,68,68,0.6)]",
    legendTitle: "Salida ZODI",
    legendDescription: "Sitios donde se concentran los insumos acopiados para despacharlos hacia los puntos de llegada (destinos verdes).",
  },
  destino: {
    label: "Centro de Acopio Destino",
    marker: "#22c55e",
    dot: "bg-green-500",
    glow: "shadow-[0_0_8px_rgba(34,197,94,0.6)]",
    legendTitle: "Destino",
    legendDescription: "Puntos de llegada donde se recibe y distribuye la ayuda a la población afectada.",
  },
  refugio: {
    label: "Refugio",
    marker: "#eab308",
    dot: "bg-yellow-500",
    glow: "shadow-[0_0_8px_rgba(234,179,8,0.6)]",
    legendTitle: "Refugio",
    legendDescription: "Espacios habilitados para alojar y asistir temporalmente a personas afectadas.",
  },
};

export const NEED_LABELS: Record<HubNeedType, string> = {
  TRANSPORT: "Transporte",
  LABOR: "Mano de obra",
  FUEL: "Combustible",
  OTHER: "Otros",
};
