import { z } from "zod";

/**
 * Incidents bounded context — lenguaje compartido entre `api` y `web`.
 * Un `Incident` es un evento de desastre activo. Prioridad y estado son su
 * lenguaje ubicuo: viven acá como fuente de verdad del boundary.
 */

export const PRIORITIES = ["CRITICAL", "HIGH", "MEDIUM", "LOW"] as const;
export const prioritySchema = z.enum(PRIORITIES);
export type PriorityName = z.infer<typeof prioritySchema>;

export const INCIDENT_STATUSES = ["ACTIVE", "CONTAINED", "CLOSED"] as const;
export const incidentStatusSchema = z.enum(INCIDENT_STATUSES);
export type IncidentStatusName = z.infer<typeof incidentStatusSchema>;

export const createIncidentSchema = z.object({
  title: z.string().trim().min(3).max(160),
  description: z.string().trim().min(1).max(2000),
  type: z.string().trim().min(1).max(80),
  priority: prioritySchema,
  zone: z.string().trim().min(1).max(120),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});
export type CreateIncidentRequest = z.infer<typeof createIncidentSchema>;

/**
 * Editar una emergencia: todos los campos opcionales más `status`, que permite
 * contener o cerrar el incidente. Las emergencias no se borran (solo se cierran),
 * por eso el ciclo de vida vive acá y no en un endpoint de delete.
 */
export const updateIncidentSchema = createIncidentSchema.partial().extend({
  status: incidentStatusSchema.optional(),
});
export type UpdateIncidentRequest = z.infer<typeof updateIncidentSchema>;

export interface PublicIncident {
  id: string;
  title: string;
  description: string;
  type: string;
  priority: PriorityName;
  status: IncidentStatusName;
  zone: string;
  latitude: number;
  longitude: number;
  reportedById: string | null;
  createdAt: string;
  updatedAt: string;
}
