import type { PublicResource } from "@sos/shared";
import type { ResourceRepository } from "../../domain/resources/repositories/resource.repository";

/**
 * Use case: listar los recursos disponibles en un hub.
 */
export class ListResourcesByHub {
  constructor(private readonly resources: ResourceRepository) {}

  async execute(hubId: string): Promise<PublicResource[]> {
    const resources = await this.resources.findByHub(hubId);
    return resources.map((resource) => resource.toPublic());
  }
}
