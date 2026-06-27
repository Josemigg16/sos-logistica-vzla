import { z } from "zod";
import { inventoryCategorySchema, type InventoryCategoryName } from "./resources";

/**
 * Inventory Batches — lote de inventario en un hub. Un lote representa una
 * cantidad de "lotes" (unidad atómica del negocio) de un producto del catálogo
 * recibido en un momento dado. El stock disponible de un hub es la suma de
 * sus batches agrupada por producto.
 */

export const registerInventoryBatchSchema = z.object({
  hubId: z.string().uuid(),
  productId: z.string().uuid(),
  quantityBatches: z.number().int().positive(),
});
export type RegisterInventoryBatchRequest = z.infer<typeof registerInventoryBatchSchema>;

export interface PublicInventoryBatch {
  id: string;
  hubId: string;
  productId: string;
  quantityBatches: number;
  sourceHubId: string | null;
  receivedAt: string;
}

/**
 * Resumen de stock por producto en un hub — agregado de batches.
 */
export interface PublicHubStockLine {
  productId: string;
  productName: string;
  category: InventoryCategoryName;
  totalBatches: number;
}
