import { z } from "zod";
import { HUB_STATUSES, hubNeedSchema } from "./resources";

/**
 * Constantes y schemas de dominio compartidos entre `api` y `web`.
 * El lenguaje ubicuo vive acá: la fuente de verdad de los términos
 * que cruzan el boundary frontend ↔ backend.
 */

export const PRIORIDADES = ["CRITICA", "ALTA", "MEDIA", "BAJA"] as const;
export const prioridadSchema = z.enum(PRIORIDADES);
export type Prioridad = z.infer<typeof prioridadSchema>;

export const TIPOS_CENTRO = ["acopio", "salida", "destino"] as const;
export const tipoCentroSchema = z.enum(TIPOS_CENTRO);
export type TipoCentro = z.infer<typeof tipoCentroSchema>;

export const verificacionSchema = z.object({
  imagenes: z.array(z.string()),
  fecha: z.string(),
  operario: z.string(),
  novedades: z.string().optional(),
});

export const centroSchema = z.object({
  id: z.string(),
  nombre: z.string(),
  direccion: z.string(),
  contacto: z.string(),
  responsable: z.string(),
  coordenadas: z.tuple([z.number(), z.number()]),
  tipo: tipoCentroSchema,
  estado: z.enum(HUB_STATUSES).optional(),
  isInformal: z.boolean().optional().default(false),
  inventario: z.record(z.string(), z.number()),
  needs: z.array(hubNeedSchema).optional().default([]),
  metadata: z.record(z.unknown()).optional(),
  verificacion: verificacionSchema.optional(),
});


export type Centro = z.infer<typeof centroSchema>;

export * from "./identity";
export * from "./incidents";
export * from "./resources";
export * from "./operations";
export * from "./needs";
export * from "./fleet";
export * from "./cargo";
export * from "./inventory-batches";
export * from "./convoys";
export * from "./settings";

