import { and, eq } from "drizzle-orm";
import { db } from "./db";
import { resources, products } from "./schema";
import type { ResourceRepository } from "../../domain/resources/repositories/resource.repository";
import { Resource } from "../../domain/resources/entities/resource";
import { InventoryCategory } from "../../domain/resources/value-objects/inventory-category";

type ResourceRow = typeof resources.$inferSelect;

function toDomain(row: ResourceRow, productName: string | null): Resource {
  return Resource.rehydrate({
    id: row.id,
    hubId: row.hubId,
    productId: row.productId ?? null,
    productName: productName ?? "",
    category: InventoryCategory.create(row.category),
    quantity: row.quantity,
    unit: row.unit,
    updatedAt: row.updatedAt,
  });
}

export class DrizzleResourceRepository implements ResourceRepository {
  async findById(id: string): Promise<Resource | null> {
    const [row] = await db
      .select({ resource: resources, productName: products.name })
      .from(resources)
      .leftJoin(products, eq(resources.productId, products.id))
      .where(eq(resources.id, id))
      .limit(1);
    return row ? toDomain(row.resource, row.productName) : null;
  }

  async findByHub(hubId: string): Promise<Resource[]> {
    const rows = await db
      .select({ resource: resources, productName: products.name })
      .from(resources)
      .leftJoin(products, eq(resources.productId, products.id))
      .where(eq(resources.hubId, hubId));
    return rows.map((r) => toDomain(r.resource, r.productName));
  }

  async findByHubAndProduct(
    hubId: string,
    productId: string,
  ): Promise<Resource | null> {
    const [row] = await db
      .select({ resource: resources, productName: products.name })
      .from(resources)
      .leftJoin(products, eq(resources.productId, products.id))
      .where(
        and(eq(resources.hubId, hubId), eq(resources.productId, productId)),
      )
      .limit(1);
    return row ? toDomain(row.resource, row.productName) : null;
  }

  async save(resource: Resource): Promise<void> {
    const pub = resource.toPublic();
    const values = {
      id: pub.id,
      hubId: pub.hubId,
      productId: pub.productId,
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
