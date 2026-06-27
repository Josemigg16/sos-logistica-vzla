import { sql, eq } from "drizzle-orm";
import { db } from "./db";
import { products } from "./schema";
import type { ProductCatalogPort, ProductEntry } from "../../application/needs/ports/product-catalog.port";

type ProductRow = typeof products.$inferSelect;

function toEntry(row: ProductRow): ProductEntry {
  return { id: row.id, name: row.name, category: row.category, unit: row.unit };
}

/**
 * Adapter Drizzle del puerto ProductCatalogPort.
 * Búsqueda case-insensitive por nombre (replica comportamiento legacy con LOWER()).
 */
export class DrizzleProductCatalogRepository implements ProductCatalogPort {
  async findByName(name: string): Promise<ProductEntry | null> {
    const [row] = await db
      .select()
      .from(products)
      .where(eq(sql`LOWER(${products.name})`, name.toLowerCase()))
      .limit(1);
    return row ? toEntry(row) : null;
  }

  async findById(id: string): Promise<ProductEntry | null> {
    const [row] = await db.select().from(products).where(eq(products.id, id)).limit(1);
    return row ? toEntry(row) : null;
  }

  async create(product: ProductEntry & { description: string }): Promise<void> {
    await db.insert(products).values({
      id: product.id,
      name: product.name,
      category: product.category as any,
      unit: product.unit,
      description: product.description,
    });
  }
}
