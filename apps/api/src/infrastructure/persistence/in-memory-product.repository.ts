import type { ProductRepository } from "../../domain/resources/repositories/product.repository";
import type { Product } from "../../domain/resources/entities/product";

const normalize = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/\p{Mn}/gu, "");

/**
 * Adapter in-memory del puerto ProductRepository. Para tests y para correr la API
 * sin Postgres. Misma interfaz que el adapter de Drizzle.
 */
export class InMemoryProductRepository implements ProductRepository {
  private readonly byId = new Map<string, Product>();

  async findAll(): Promise<Product[]> {
    return [...this.byId.values()];
  }

  async findById(id: string): Promise<Product | null> {
    return this.byId.get(id) ?? null;
  }

  async findByName(name: string): Promise<Product | null> {
    for (const product of this.byId.values()) {
      if (normalize(product.name) === normalize(name)) {
        return product;
      }
    }
    return null;
  }

  async save(product: Product): Promise<void> {
    this.byId.set(product.id, product);
  }

  async delete(id: string): Promise<void> {
    this.byId.delete(id);
  }
}
