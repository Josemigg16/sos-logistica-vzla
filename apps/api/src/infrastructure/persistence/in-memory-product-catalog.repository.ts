import type { ProductCatalogPort, ProductEntry } from "../../application/needs/ports/product-catalog.port";

type StoredProduct = ProductEntry & { description: string };

/**
 * Adapter in-memory del puerto ProductCatalogPort.
 * Para tests y para correr la API sin Postgres. Búsqueda case-insensitive
 * por nombre, igual que el adapter Drizzle.
 */
export class InMemoryProductCatalogRepository implements ProductCatalogPort {
  private readonly byId = new Map<string, StoredProduct>();
  /** lowercase name → id */
  private readonly byName = new Map<string, string>();

  async findByName(name: string): Promise<ProductEntry | null> {
    const id = this.byName.get(name.toLowerCase());
    if (!id) return null;
    const entry = this.byId.get(id);
    return entry ?? null;
  }

  async findById(id: string): Promise<ProductEntry | null> {
    return this.byId.get(id) ?? null;
  }

  async create(product: StoredProduct): Promise<void> {
    this.byId.set(product.id, product);
    this.byName.set(product.name.toLowerCase(), product.id);
  }
}
