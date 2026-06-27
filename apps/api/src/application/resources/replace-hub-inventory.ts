import type { HubRepository } from "../../domain/resources/repositories/hub.repository";
import type { ResourceRepository } from "../../domain/resources/repositories/resource.repository";
import { Resource } from "../../domain/resources/entities/resource";
import { InventoryCategory } from "../../domain/resources/value-objects/inventory-category";
import { HubNotFoundError } from "../../domain/resources/errors";

export interface ReplaceInventoryCommand {
  hubId: string;
  /**
   * Map of InventoryCategoryName label → quantity.
   * Any existing resources for the hub are removed and replaced atomically.
   */
  inventory: Record<string, number>;
}

/**
 * Use case: replace all resources for a hub in one shot.
 * Invariant: hub must exist. Existing resources are deleted before the new
 * ones are inserted, so this is a full replacement (not an accumulation).
 */
export class ReplaceHubInventory {
  constructor(
    private readonly hubs: HubRepository,
    private readonly resources: ResourceRepository,
  ) {}

  async execute(command: ReplaceInventoryCommand): Promise<void> {
    const hub = await this.hubs.findById(command.hubId);
    if (!hub) throw new HubNotFoundError(command.hubId);

    await this.resources.deleteByHub(command.hubId);

    for (const [categoryLabel, quantity] of Object.entries(command.inventory)) {
      if (quantity < 0) continue; // skip negative quantities silently
      const category = InventoryCategory.create(categoryLabel);
      const resource = Resource.create({
        id: crypto.randomUUID(),
        hubId: command.hubId,
        category,
        quantity,
        unit: "unidades",
      });
      await this.resources.save(resource);
    }
  }
}
