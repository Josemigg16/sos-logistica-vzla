import type { UpdateProductRequest, ProductMaster } from "@sos/shared";
import type { ProductRepository } from "../../domain/resources/repositories/product.repository";
import { DuplicateProductNameError, ProductNotFoundError } from "../../domain/resources/errors";

/**
 * Use case: actualizar un producto del catálogo maestro.
 * Verifica existencia (404) y unicidad del nuevo nombre (409) excluyendo el propio id.
 */
export class UpdateProduct {
  constructor(private readonly products: ProductRepository) {}

  async execute(id: string, command: UpdateProductRequest): Promise<ProductMaster> {
    const product = await this.products.findById(id);
    if (!product) throw new ProductNotFoundError(id);

    const trimmedName = command.name.trim();
    const conflict = await this.products.findByName(trimmedName);
    if (conflict && conflict.id !== id) throw new DuplicateProductNameError(trimmedName);

    product.update({
      name: trimmedName,
      category: command.category,
      unit: command.unit.trim(),
      description: command.description.trim(),
    });
    await this.products.save(product);
    return product.toPublic();
  }
}
