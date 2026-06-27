import { z } from "zod";

/**
 * Resources bounded context — inventario y disponibilidad.
 * Un `Hub` es un centro de acopio; un `Resource` es un bien disponible en él.
 * Las categorías de inventario son labels de UI (en español, por diseño).
 */

export const HUB_TYPES = ["COLLECTION", "DISPATCH", "DESTINATION"] as const;
export const hubTypeSchema = z.enum(HUB_TYPES);
export type HubType = z.infer<typeof hubTypeSchema>;

// Catálogo de categorías de inventario. Valores = labels de UI en español.
export const INVENTORY_CATEGORIES = [
  "Víveres",
  "Medicamentos",
  "Higiene personal",
  "Abrigo y refugio",
  "Herramientas",
  "Productos de limpieza",
  "Artículos para bebés y grupos vulnerables",
] as const;
export const inventoryCategorySchema = z.enum(INVENTORY_CATEGORIES);
export type InventoryCategoryName = z.infer<typeof inventoryCategorySchema>;

export const createHubSchema = z.object({
  name: z.string().trim().min(3).max(160),
  address: z.string().trim().min(1).max(255),
  contact: z.string().trim().min(1).max(120),
  type: hubTypeSchema,
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});
export type CreateHubRequest = z.infer<typeof createHubSchema>;

export const stockResourceSchema = z.object({
  hubId: z.string().uuid(),
  category: inventoryCategorySchema,
  quantity: z.number().int().min(0),
  unit: z.string().trim().min(1).max(40),
});
export type StockResourceRequest = z.infer<typeof stockResourceSchema>;

export interface PublicHub {
  id: string;
  name: string;
  address: string;
  contact: string;
  type: HubType;
  latitude: number;
  longitude: number;
  createdAt: string;
}

export interface PublicResource {
  id: string;
  hubId: string;
  category: InventoryCategoryName;
  quantity: number;
  unit: string;
  updatedAt: string;
}
