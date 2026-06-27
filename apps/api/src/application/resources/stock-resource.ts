import type { PublicResource, StockResourceRequest } from "@sos/shared";
import type { HubRepository } from "../../domain/resources/repositories/hub.repository";
import type { ResourceRepository } from "../../domain/resources/repositories/resource.repository";
import type { ProductRepository } from "../../domain/resources/repositories/product.repository";
import type { InventoryBatchRepository } from "../../domain/resources/repositories/inventory-batch.repository";
import { Resource } from "../../domain/resources/entities/resource";
import { InventoryBatch } from "../../domain/resources/entities/inventory-batch";
import { InventoryCategory } from "../../domain/resources/value-objects/inventory-category";
import { HubNotFoundError, ProductNotFoundError } from "../../domain/resources/errors";

/**
 * Use case: sumar stock de un producto a un hub. La categoría y la unidad se
 * derivan del producto del catálogo. Si ya existe stock de ese producto en el
 * hub, acumula; si no, lo crea.
 */
export class StockResource {
  constructor(
    private readonly hubs: HubRepository,
    private readonly resources: ResourceRepository,
    private readonly products: ProductRepository,
    private readonly batches: InventoryBatchRepository,
  ) {}

  async execute(command: StockResourceRequest): Promise<PublicResource> {
    const hub = await this.hubs.findById(command.hubId);
    if (!hub) throw new HubNotFoundError(command.hubId);

    const product = await this.products.findById(command.productId);
    if (!product) throw new ProductNotFoundError(command.productId);

    const existing = await this.resources.findByHubAndProduct(
      command.hubId,
      command.productId,
    );

    const resource =
      existing ??
      Resource.create({
        id: crypto.randomUUID(),
        hubId: command.hubId,
        productId: product.id,
        productName: product.name,
        category: InventoryCategory.create(product.category),
        quantity: 0,
        unit: product.unit,
      });

    resource.addStock(command.quantity);
    await this.resources.save(resource);

    // Guardar el registro en el histórico de ingresos (inventory_batches)
    const batch = InventoryBatch.register({
      id: crypto.randomUUID(),
      hubId: command.hubId,
      productId: command.productId,
      quantityBatches: command.quantity,
    });
    await this.batches.save(batch);

    return resource.toPublic();
  }
}
