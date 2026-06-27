import type { Resource } from "../entities/resource";

/**
 * Puerto del repositorio de recursos. La implementación vive en infra.
 */
export interface ResourceRepository {
  findById(id: string): Promise<Resource | null>;
  findByHub(hubId: string): Promise<Resource[]>;
  findByHubAndProduct(
    hubId: string,
    productId: string,
  ): Promise<Resource | null>;
  save(resource: Resource): Promise<void>;
  deleteByHub(hubId: string): Promise<void>;
}
