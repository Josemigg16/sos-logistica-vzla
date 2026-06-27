import type { Product } from "../entities/product";

/**
 * Puerto del repositorio de productos. La implementación vive en infra.
 */
export interface ProductRepository {
  findAll(): Promise<Product[]>;
  findById(id: string): Promise<Product | null>;
  findByName(name: string): Promise<Product | null>;
  save(product: Product): Promise<void>;
  delete(id: string): Promise<void>;
}
