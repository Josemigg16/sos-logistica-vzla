import type { PublicResource, StockResourceRequest } from "@sos/shared";
import type { HubRepository } from "../../domain/resources/repositories/hub.repository";
import type { ResourceRepository } from "../../domain/resources/repositories/resource.repository";
import { Resource } from "../../domain/resources/entities/resource";
import { InventoryCategory } from "../../domain/resources/value-objects/inventory-category";
import { HubNotFoundError } from "../../domain/resources/errors";

/**
 * Use case: sumar stock de una categoría a un hub. Si ya existe un recurso de
 * esa categoría en el hub, acumula; si no, lo crea.
 */
export class StockResource {
  constructor(
    private readonly hubs: HubRepository,
    private readonly resources: ResourceRepository,
  ) {}

  async execute(command: StockResourceRequest): Promise<PublicResource> {
    const hub = await this.hubs.findById(command.hubId);
    if (!hub) throw new HubNotFoundError(command.hubId);

    const category = InventoryCategory.create(command.category);
    const existing = await this.resources.findByHubAndCategory(
      command.hubId,
      category,
    );

    const resource =
      existing ??
      Resource.create({
        id: crypto.randomUUID(),
        hubId: command.hubId,
        category,
        quantity: 0,
        unit: command.unit,
      });

    resource.addStock(command.quantity);
    await this.resources.save(resource);
    return resource.toPublic();
  }
}
