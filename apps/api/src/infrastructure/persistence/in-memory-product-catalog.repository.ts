import type { ProductCatalogPort, ProductEntry } from "../../application/needs/ports/product-catalog.port";

const normalize = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/\p{Mn}/gu, "");

type StoredProduct = ProductEntry & { description: string };

/** Adapter in-memory del puerto ProductCatalogPort. */
export class InMemoryProductCatalogRepository implements ProductCatalogPort {
  private readonly byId = new Map<string, StoredProduct>();
  private readonly byName = new Map<string, string>();

  async findByName(name: string): Promise<ProductEntry | null> {
    const id = this.byName.get(normalize(name));
    if (!id) return null;
    const entry = this.byId.get(id);
    return entry ?? null;
  }

  async findById(id: string): Promise<ProductEntry | null> {
    return this.byId.get(id) ?? null;
  }

  async create(product: StoredProduct): Promise<void> {
    this.byId.set(product.id, product);
    this.byName.set(normalize(product.name), product.id);
  }
}
