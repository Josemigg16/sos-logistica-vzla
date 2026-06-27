import type {
  PublicInventoryBatch,
  RegisterInventoryBatchRequest,
} from "@sos/shared";
import type { HubRepository } from "../../domain/resources/repositories/hub.repository";
import type { ProductRepository } from "../../domain/resources/repositories/product.repository";
import type { InventoryBatchRepository } from "../../domain/resources/repositories/inventory-batch.repository";
import { InventoryBatch } from "../../domain/resources/entities/inventory-batch";
import {
  HubNotFoundError,
  ProductNotFoundError,
} from "../../domain/resources/errors";

/**
 * Use case: registrar un lote de inventario en un hub. Valida que el hub y el
 * producto existan. En este punto del flujo no hay sourceHubId — esos batches
 * se crean automáticamente al confirmar shipments (oleada 2).
 */
export class RegisterInventoryBatch {
  constructor(
    private readonly hubs: HubRepository,
    private readonly products: ProductRepository,
    private readonly batches: InventoryBatchRepository,
  ) {}

  async execute(
    command: RegisterInventoryBatchRequest,
  ): Promise<PublicInventoryBatch> {
    const hub = await this.hubs.findById(command.hubId);
    if (!hub) throw new HubNotFoundError(command.hubId);

    const product = await this.products.findById(command.productId);
    if (!product) throw new ProductNotFoundError(command.productId);

    const batch = InventoryBatch.register({
      id: crypto.randomUUID(),
      hubId: command.hubId,
      productId: command.productId,
      quantityBatches: command.quantityBatches,
    });
    await this.batches.save(batch);
    return batch.toPublic();
  }
}
