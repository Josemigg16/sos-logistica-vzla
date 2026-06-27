import type { ProductMaster } from "@sos/shared";
import type { ProductRepository } from "../../domain/resources/repositories/product.repository";
import { ProductNotFoundError } from "../../domain/resources/errors";

/**
 * Use case: eliminar un producto del catálogo maestro.
 * Retorna el producto eliminado para que la ruta pueda incluirlo en la respuesta.
 */
export class DeleteProduct {
  constructor(private readonly products: ProductRepository) {}

  async execute(id: string): Promise<ProductMaster> {
    const product = await this.products.findById(id);
    if (!product) throw new ProductNotFoundError(id);
    await this.products.delete(id);
    return product.toPublic();
  }
}
