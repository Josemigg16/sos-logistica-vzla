import type { PublicHub } from "@sos/shared";
import type { HubRepository } from "../../domain/resources/repositories/hub.repository";

/**
 * Use case: listar centros de acopio.
 */
export class ListHubs {
  constructor(private readonly hubs: HubRepository) {}

  async execute(): Promise<PublicHub[]> {
    const hubs = await this.hubs.findAll();
    return hubs.map((hub) => hub.toPublic());
  }
}
