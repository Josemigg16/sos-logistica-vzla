import type { HubRepository } from "../../domain/resources/repositories/hub.repository";
import type { ResourceRepository } from "../../domain/resources/repositories/resource.repository";
import { HubNotFoundError } from "../../domain/resources/errors";

/**
 * Use case: delete a hub and all its resources.
 * Resources are deleted first (explicit cascade that works for both
 * InMemory and Drizzle adapters).
 */
export class DeleteHub {
  constructor(
    private readonly hubs: HubRepository,
    private readonly resources: ResourceRepository,
  ) {}

  async execute(id: string): Promise<void> {
    const hub = await this.hubs.findById(id);
    if (!hub) throw new HubNotFoundError(id);

    await this.resources.deleteByHub(id);
    await this.hubs.delete(id);
  }
}
