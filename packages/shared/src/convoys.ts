import { z } from "zod";

/**
 * Convoys bounded context — escolta ZODI de convoys de recursos.
 * Un `Convoy` es un grupo de vehículos escoltados desde un hub de salida
 * hacia un hub de destino. El ciclo de vida: PLANIFICADO → EN_RUTA → ENTREGADO
 * (o CANCELADO desde PLANIFICADO o EN_RUTA).
 */

export const CONVOY_STATUSES = [
  "PLANIFICADO",
  "EN_RUTA",
  "ENTREGADO",
  "CANCELADO",
] as const;

export const convoyStatusSchema = z.enum(CONVOY_STATUSES);
export type ConvoyStatus = z.infer<typeof convoyStatusSchema>;

export const createConvoySchema = z.object({
  origenId: z.string().uuid(),
  destinoId: z.string().uuid(),
  escoltaId: z.string().uuid(),
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
  escoltaId: string;
  vehicleIds: string[];
  status: ConvoyStatus;
  createdAt: string;
  updatedAt: string;
}
