import { z } from "zod";

/**
 * Convoys bounded context — escolta ZODI de convoys de recursos.
 * Un `Convoy` es un grupo de vehículos escoltados desde un hub de salida
 * hacia un hub de destino. El ciclo de vida:
 * PLANIFICADO → EN_RUTA → ENTREGADO → RECIBIDO
 * (o CANCELADO desde PLANIFICADO o EN_RUTA). El escolta (ZODI_SENDER) cierra
 * la entrega (ENTREGADO); el ZODI_DESTINATION confirma la llegada (RECIBIDO).
 */

export const CONVOY_STATUSES = [
  "PLANIFICADO",
  "EN_RUTA",
  "ENTREGADO",
  "RECIBIDO",
  "CANCELADO",
] as const;

export const convoyStatusSchema = z.enum(CONVOY_STATUSES);
export type ConvoyStatus = z.infer<typeof convoyStatusSchema>;

export const createConvoySchema = z.object({
  origenId: z.string().uuid(),
  destinoId: z.string().uuid(),
  escoltaNombre: z.string().min(1, "El nombre del escolta es obligatorio"),
  escoltaCedula: z.string().nullable().optional(),
  vehicleIds: z.array(z.string().uuid()).min(1),
});
export type CreateConvoyRequest = z.infer<typeof createConvoySchema>;

export const addVehicleSchema = z.object({
  vehicleId: z.string().uuid(),
});
export type AddVehicleRequest = z.infer<typeof addVehicleSchema>;

export interface PublicConvoy {
  id: string;
  origenId: string;
  destinoId: string;
  escoltaNombre: string;
  escoltaCedula: string | null;
  vehicleIds: string[];
  status: ConvoyStatus;
  createdAt: string;
  updatedAt: string;
}

/**
 * Escolta candidato para planificar una caravana: un usuario con rol
 * `ZODI_SENDER`. Vista mínima para poblar el selector de escolta sin exponer
 * el resto del perfil del usuario.
 */
export interface PublicEscort {
  id: string;
  username: string;
}
