import type { HubStatus, PublicHub } from "@sos/shared";
import type { HubRepository } from "../../domain/resources/repositories/hub.repository";
import { HubNotFoundError } from "../../domain/resources/errors";

export interface ChangeHubStatusCommand {
  hubId: string;
  status: HubStatus;
}

/**
 * Use case: activar o desactivar un centro de acopio. Los centros que arrancan
 * INACTIVO (creados desde el mapa público o por un coordinador) requieren que
 * un rol interno (ADMIN/MANAGER/ZODI) los verifique y los active.
 */
export class ChangeHubStatus {
  constructor(private readonly hubs: HubRepository) {}

  async execute(command: ChangeHubStatusCommand): Promise<PublicHub> {
    const hub = await this.hubs.findById(command.hubId);
    if (!hub) {
      throw new HubNotFoundError(command.hubId);
    }
    if (command.status === "ACTIVO") {
      hub.activate();
    } else {
      hub.deactivate();
    }
    await this.hubs.save(hub);
    return hub.toPublic();
  }
}
