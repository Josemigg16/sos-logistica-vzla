import { z } from "zod";

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

export const centroSchema = z.object({
  id: z.string(),
  nombre: z.string(),
  direccion: z.string(),
  contacto: z.string(),
  responsable: z.string(),
  coordenadas: z.tuple([z.number(), z.number()]),
  tipo: tipoCentroSchema,
  inventario: z.record(z.string(), z.number()),
});

export type Centro = z.infer<typeof centroSchema>;

