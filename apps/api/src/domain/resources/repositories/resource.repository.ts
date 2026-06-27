import type { Resource } from "../entities/resource";
import type { InventoryCategory } from "../value-objects/inventory-category";

/**
 * Puerto del repositorio de recursos. La implementación vive en infra.
 */
export interface ResourceRepository {
  findById(id: string): Promise<Resource | null>;
  findByHub(hubId: string): Promise<Resource[]>;
  findByHubAndCategory(
    hubId: string,
    category: InventoryCategory,
  ): Promise<Resource | null>;
  save(resource: Resource): Promise<void>;
  deleteByHub(hubId: string): Promise<void>;
}
