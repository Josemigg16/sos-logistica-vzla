import { z } from "zod";
import { inventoryCategorySchema } from "./resources";

// `prioridadSchema` vive en index.ts. Lo redefinimos acá para evitar
// el ciclo de importación (index re-exporta needs).
const PRIORIDADES = ["CRITICA", "ALTA", "MEDIA", "BAJA"] as const;
const prioridadSchema = z.enum(PRIORIDADES);

/**
 * Needs bounded context — necesidades públicas que se muestran en el panel
 * principal. Un coordinador con rol ADMIN o ZODI_DESTINATION las crea/edita.
 * Los donantes las consultan sin autenticación.
 */

export const needSchema = z.object({
  id: z.string().uuid(),
  nombre: z.string().trim().min(1).max(160),
  categoria: inventoryCategorySchema,
  unidad: z.string().trim().min(1).max(40),
  meta: z.number().int().positive(),
  recibido: z.number().int().min(0),
  prioridad: prioridadSchema,
  descripcion: z.string().max(500).default(""),
  fechaNecesidad: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato esperado YYYY-MM-DD"),
  ultimaActualizacion: z.string(),
});
export type Need = z.infer<typeof needSchema>;

/** Payload para crear una necesidad — el server asigna `id` y `ultimaActualizacion`. */
export const createNeedSchema = needSchema
  .omit({ id: true, ultimaActualizacion: true })
  .extend({
    recibido: z.number().int().min(0).default(0),
    descripcion: z.string().max(500).optional().default(""),
  });
export type CreateNeedRequest = z.infer<typeof createNeedSchema>;

/** Payload para actualizar — todos los campos opcionales (PATCH-like). */
export const updateNeedSchema = createNeedSchema.partial();
export type UpdateNeedRequest = z.infer<typeof updateNeedSchema>;
