import type { PublicHubStockLine } from "@sos/shared";
import type { HubRepository } from "../../domain/resources/repositories/hub.repository";
import type { ProductRepository } from "../../domain/resources/repositories/product.repository";
import type { InventoryBatchRepository } from "../../domain/resources/repositories/inventory-batch.repository";
import { HubNotFoundError } from "../../domain/resources/errors";

/**
 * Use case: obtener el stock agregado de un hub por producto. Suma todos los
 * batches del hub agrupados por productId y enriquece con datos del catálogo
 * para devolverlos listos para mostrar.
 */
export class GetHubStockSummary {
  constructor(
    private readonly hubs: HubRepository,
    private readonly products: ProductRepository,
    private readonly batches: InventoryBatchRepository,
  ) {}

  async execute(hubId: string): Promise<PublicHubStockLine[]> {
    const hub = await this.hubs.findById(hubId);
    if (!hub) throw new HubNotFoundError(hubId);

    const batches = await this.batches.findByHub(hubId);
    const totals = new Map<string, number>();
    for (const batch of batches) {
      totals.set(
        batch.productId,
        (totals.get(batch.productId) ?? 0) + batch.quantityBatches,
      );
    }

    const lines: PublicHubStockLine[] = [];
    for (const [productId, totalBatches] of totals) {
      const product = await this.products.findById(productId);
      if (!product) continue;
      lines.push({
        productId,
        productName: product.name,
        category: product.category,
        totalBatches,
      });
    }
    return lines.sort((a, b) => a.productName.localeCompare(b.productName));
  }
}
