import { desc, eq } from "drizzle-orm";
import { db } from "./db";
import { inventoryBatches } from "./schema";
import type { InventoryBatchRepository } from "../../domain/resources/repositories/inventory-batch.repository";
import { InventoryBatch } from "../../domain/resources/entities/inventory-batch";

type InventoryBatchRow = typeof inventoryBatches.$inferSelect;

function toDomain(row: InventoryBatchRow): InventoryBatch {
  return InventoryBatch.rehydrate({
    id: row.id,
    hubId: row.hubId,
    productId: row.productId,
    quantityBatches: row.quantityBatches,
    sourceHubId: row.sourceHubId ?? null,
    receivedAt: row.receivedAt,
  });
}

export class DrizzleInventoryBatchRepository implements InventoryBatchRepository {
  async findById(id: string): Promise<InventoryBatch | null> {
    const [row] = await db
      .select()
      .from(inventoryBatches)
      .where(eq(inventoryBatches.id, id))
      .limit(1);
    return row ? toDomain(row) : null;
  }

  async findByHub(hubId: string): Promise<InventoryBatch[]> {
    const rows = await db
      .select()
      .from(inventoryBatches)
      .where(eq(inventoryBatches.hubId, hubId))
      .orderBy(desc(inventoryBatches.receivedAt));
    return rows.map(toDomain);
  }

  async save(batch: InventoryBatch): Promise<void> {
    const pub = batch.toPublic();
    const values = {
      id: pub.id,
      hubId: pub.hubId,
      productId: pub.productId,
      quantityBatches: pub.quantityBatches,
      sourceHubId: pub.sourceHubId,
      receivedAt: new Date(pub.receivedAt),
    };
    await db
      .insert(inventoryBatches)
      .values(values)
      .onConflictDoUpdate({
        target: inventoryBatches.id,
        set: {
          quantityBatches: values.quantityBatches,
          sourceHubId: values.sourceHubId,
        },
      });
  }

  async delete(id: string): Promise<void> {
    await db.delete(inventoryBatches).where(eq(inventoryBatches.id, id));
  }
}
