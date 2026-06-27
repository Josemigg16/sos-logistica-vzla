import { and, eq } from "drizzle-orm";
import { db } from "./db";
import { resources } from "./schema";
import type { ResourceRepository } from "../../domain/resources/repositories/resource.repository";
import { Resource } from "../../domain/resources/entities/resource";
import { InventoryCategory } from "../../domain/resources/value-objects/inventory-category";

type ResourceRow = typeof resources.$inferSelect;

function toDomain(row: ResourceRow): Resource {
  return Resource.rehydrate({
    id: row.id,
    hubId: row.hubId,
    category: InventoryCategory.create(row.category),
    quantity: row.quantity,
    unit: row.unit,
    updatedAt: row.updatedAt,
  });
}

export class DrizzleResourceRepository implements ResourceRepository {
  async findById(id: string): Promise<Resource | null> {
    const [row] = await db
      .select()
      .from(resources)
      .where(eq(resources.id, id))
      .limit(1);
    return row ? toDomain(row) : null;
  }

  async findByHub(hubId: string): Promise<Resource[]> {
    const rows = await db
      .select()
      .from(resources)
      .where(eq(resources.hubId, hubId));
    return rows.map(toDomain);
  }

  async findByHubAndCategory(
    hubId: string,
    category: InventoryCategory,
  ): Promise<Resource | null> {
    const [row] = await db
      .select()
      .from(resources)
      .where(
        and(eq(resources.hubId, hubId), eq(resources.category, category.value)),
      )
      .limit(1);
    return row ? toDomain(row) : null;
  }

  async save(resource: Resource): Promise<void> {
    const pub = resource.toPublic();
    const values = {
      id: pub.id,
      hubId: pub.hubId,
      category: pub.category,
      quantity: pub.quantity,
      unit: pub.unit,
      updatedAt: new Date(pub.updatedAt),
    };
    await db
      .insert(resources)
      .values(values)
      .onConflictDoUpdate({
        target: resources.id,
        set: {
          quantity: values.quantity,
          unit: values.unit,
          updatedAt: values.updatedAt,
        },
      });
  }

  async deleteByHub(hubId: string): Promise<void> {
    await db.delete(resources).where(eq(resources.hubId, hubId));
  }
}
