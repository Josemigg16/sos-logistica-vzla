import type { InventoryBatch } from "../entities/inventory-batch";

/**
 * Puerto del repositorio de lotes de inventario. La implementación vive en infra.
 */
export interface InventoryBatchRepository {
  findById(id: string): Promise<InventoryBatch | null>;
  findByHub(hubId: string): Promise<InventoryBatch[]>;
  save(batch: InventoryBatch): Promise<void>;
  delete(id: string): Promise<void>;
}
