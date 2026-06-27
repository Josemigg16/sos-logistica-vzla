import type { PublicInventoryBatch } from "@sos/shared";
import type { InventoryBatchRepository } from "../../domain/resources/repositories/inventory-batch.repository";

/**
 * Use case: listar los lotes de inventario registrados en un hub. Devuelve
 * cada lote individual — útil para histórico de ingresos.
 */
export class ListInventoryBatchesByHub {
  constructor(private readonly batches: InventoryBatchRepository) {}

  async execute(hubId: string): Promise<PublicInventoryBatch[]> {
    const batches = await this.batches.findByHub(hubId);
    return batches
      .sort((a, b) => b.receivedAt.getTime() - a.receivedAt.getTime())
      .map((b) => b.toPublic());
  }
}
