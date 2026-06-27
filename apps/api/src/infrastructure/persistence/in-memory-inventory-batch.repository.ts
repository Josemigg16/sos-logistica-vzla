import type { InventoryBatchRepository } from "../../domain/resources/repositories/inventory-batch.repository";
import type { InventoryBatch } from "../../domain/resources/entities/inventory-batch";

/**
 * Adapter in-memory del puerto InventoryBatchRepository. Para tests y para
 * correr la API sin Postgres. Misma interfaz que el adapter de Drizzle.
 */
export class InMemoryInventoryBatchRepository implements InventoryBatchRepository {
  private readonly byId = new Map<string, InventoryBatch>();

  async findById(id: string): Promise<InventoryBatch | null> {
    return this.byId.get(id) ?? null;
  }

  async findByHub(hubId: string): Promise<InventoryBatch[]> {
    return [...this.byId.values()].filter((b) => b.hubId === hubId);
  }

  async save(batch: InventoryBatch): Promise<void> {
    this.byId.set(batch.id, batch);
  }

  async delete(id: string): Promise<void> {
    this.byId.delete(id);
  }
}
