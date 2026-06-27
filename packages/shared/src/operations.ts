import { z } from "zod";

/**
 * Operations bounded context — coordinación de respuesta activa.
 * Una `Operation` es una misión de respuesta; un `Assignment` vincula un
 * recurso a una operación. Las referencias cruzadas (incidente, recurso) van
 * por ID: este módulo no importa entidades de otros contextos.
 */

export const OPERATION_STATUSES = [
  "PLANNED",
  "ACTIVE",
  "COMPLETED",
  "CANCELLED",
] as const;
export const operationStatusSchema = z.enum(OPERATION_STATUSES);
export type OperationStatusName = z.infer<typeof operationStatusSchema>;

export const createOperationSchema = z.object({
  name: z.string().trim().min(3).max(160),
  incidentId: z.string().uuid(),
  zone: z.string().trim().min(1).max(120),
});
export type CreateOperationRequest = z.infer<typeof createOperationSchema>;

export const createAssignmentSchema = z.object({
  resourceId: z.string().uuid(),
  quantity: z.number().int().positive(),
});
export type CreateAssignmentRequest = z.infer<typeof createAssignmentSchema>;

export interface PublicOperation {
  id: string;
  name: string;
  status: OperationStatusName;
  incidentId: string;
  zone: string;
  createdAt: string;
  updatedAt: string;
}

export interface PublicAssignment {
  id: string;
  operationId: string;
  resourceId: string;
  quantity: number;
  createdAt: string;
}
