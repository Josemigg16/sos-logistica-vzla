import type { PublicHub } from "@sos/shared";
import type { HubRepository } from "../../domain/resources/repositories/hub.repository";

/**
 * Use case: obtener el centro de acopio asociado a un coordinador (o null si
 * todavía no registró ninguno).
 */
export class GetHubByCoordinator {
  constructor(private readonly hubs: HubRepository) {}

  async execute(coordinatorId: string): Promise<PublicHub | null> {
    const hub = await this.hubs.findByCoordinator(coordinatorId);
    return hub ? hub.toPublic() : null;
  }
}
