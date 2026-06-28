import { eq, sql } from "drizzle-orm";
import { db } from "./db";
import { products } from "./schema";
import type { ProductRepository } from "../../domain/resources/repositories/product.repository";
import { Product } from "../../domain/resources/entities/product";

type ProductRow = typeof products.$inferSelect;

function toDomain(row: ProductRow): Product {
  return Product.rehydrate({
    id: row.id,
    name: row.name,
    category: row.category,
    unit: row.unit,
    description: row.description,
    createdAt: row.createdAt,
  });
}

export class DrizzleProductRepository implements ProductRepository {
  async findAll(): Promise<Product[]> {
    const rows = await db.select().from(products);
    return rows.map(toDomain);
  }

  async findById(id: string): Promise<Product | null> {
    const [row] = await db.select().from(products).where(eq(products.id, id)).limit(1);
    return row ? toDomain(row) : null;
  }

  async findByName(name: string): Promise<Product | null> {
    const [row] = await db
      .select()
      .from(products)
      .where(eq(sql`unaccent(lower(${products.name}))`, sql`unaccent(lower(${name}))`))
      .limit(1);
    return row ? toDomain(row) : null;
  }

  async save(product: Product): Promise<void> {
    const values = {
      id: product.id,
      name: product.name,
      category: product.category,
      unit: product.unit,
      description: product.description,
      createdAt: product.createdAt,
    };
    await db
      .insert(products)
      .values(values)
      .onConflictDoUpdate({
        target: products.id,
        set: {
          name: values.name,
          category: values.category,
          unit: values.unit,
          description: values.description,
        },
      });
  }

  async delete(id: string): Promise<void> {
    await db.delete(products).where(eq(products.id, id));
  }
}
