import type { InventoryBatchRepository } from "../../domain/resources/repositories/inventory-batch.repository";
import { InventoryBatchNotFoundError } from "../../domain/resources/errors";

/**
 * Use case: eliminar un lote de inventario registrado. Útil para corregir un
 * ingreso registrado por error. El stock se recalcula al listar.
 */
export class DeleteInventoryBatch {
  constructor(private readonly batches: InventoryBatchRepository) {}

  async execute(id: string): Promise<void> {
    const existing = await this.batches.findById(id);
    if (!existing) throw new InventoryBatchNotFoundError(id);
    await this.batches.delete(id);
  }
}
