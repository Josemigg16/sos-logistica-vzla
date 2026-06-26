import { z } from "zod";

/**
 * Constantes y schemas de dominio compartidos entre `api` y `web`.
 * El lenguaje ubicuo vive acá: la fuente de verdad de los términos
 * que cruzan el boundary frontend ↔ backend.
 */

export const PRIORIDADES = ["CRITICA", "ALTA", "MEDIA", "BAJA"] as const;

export const prioridadSchema = z.enum(PRIORIDADES);

export type Prioridad = z.infer<typeof prioridadSchema>;
