import type { CreateProductRequest, ProductMaster } from "@sos/shared";
import type { ProductRepository } from "../../domain/resources/repositories/product.repository";
import { Product } from "../../domain/resources/entities/product";
import { DuplicateProductNameError } from "../../domain/resources/errors";

/**
 * Use case: agregar un producto al catálogo maestro.
 * La unicidad del nombre se verifica antes de persistir.
 */
export class CreateProduct {
  constructor(private readonly products: ProductRepository) {}

  async execute(command: CreateProductRequest): Promise<ProductMaster> {
    const trimmedName = command.name.trim();
    const existing = await this.products.findByName(trimmedName);
    if (existing) throw new DuplicateProductNameError(trimmedName);

    const product = Product.create({
      id: crypto.randomUUID(),
      name: trimmedName,
      category: command.category,
      unit: command.unit.trim(),
      description: command.description.trim(),
    });
    await this.products.save(product);
    return product.toPublic();
  }
}
