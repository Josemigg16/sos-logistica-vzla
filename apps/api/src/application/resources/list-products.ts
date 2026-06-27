import type { ProductMaster } from "@sos/shared";
import type { ProductRepository } from "../../domain/resources/repositories/product.repository";

/**
 * Use case: listar todos los productos del catálogo maestro.
 */
export class ListProducts {
  constructor(private readonly products: ProductRepository) {}

  async execute(): Promise<ProductMaster[]> {
    const all = await this.products.findAll();
    return all.map((p) => p.toPublic());
  }
}
