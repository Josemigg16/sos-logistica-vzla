/**
 * Puerto de catálogo de productos — usado por el use case CreateNeed para la
 * regla de negocio "auto-crear producto si no existe".
 *
 * Se define en el lado `needs` para NO importar nada del slice `products`.
 * El orquestador conectará este puerto a la implementación real (Drizzle o
 * InMemory) al ensamblar el módulo.
 */
export interface ProductEntry {
  id: string;
  name: string;
  category: string;
  unit: string;
}

export interface ProductCatalogPort {
  findByName(name: string): Promise<ProductEntry | null>;
  findById(id: string): Promise<ProductEntry | null>;
  create(product: ProductEntry & { description: string }): Promise<void>;
}
