import type { ResourceRepository } from "../../domain/resources/repositories/resource.repository";
import type { Resource } from "../../domain/resources/entities/resource";
import type { InventoryCategory } from "../../domain/resources/value-objects/inventory-category";

/**
 * Adapter in-memory del puerto ResourceRepository.
 */
export class InMemoryResourceRepository implements ResourceRepository {
  private readonly byId = new Map<string, Resource>();

  async findById(id: string): Promise<Resource | null> {
    return this.byId.get(id) ?? null;
  }

  async findByHub(hubId: string): Promise<Resource[]> {
    return [...this.byId.values()].filter((r) => r.hubId === hubId);
  }

  async findByHubAndCategory(
    hubId: string,
    category: InventoryCategory,
  ): Promise<Resource | null> {
    for (const resource of this.byId.values()) {
      if (resource.hubId === hubId && resource.category.equals(category)) {
        return resource;
      }
    }
    return null;
  }

  async save(resource: Resource): Promise<void> {
    this.byId.set(resource.id, resource);
  }
}
