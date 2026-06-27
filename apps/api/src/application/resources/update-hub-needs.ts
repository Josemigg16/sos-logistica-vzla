import type { HubNeed, PublicHub } from "@sos/shared";
import type { HubRepository } from "../../domain/resources/repositories/hub.repository";
import { HubNotFoundError } from "../../domain/resources/errors";

export interface UpdateHubNeedsCommand {
  hubId: string;
  needs: HubNeed[];
}

/**
 * Use case: replace the operational needs (transport/labor/fuel/other) of a hub.
 * Does not touch inventory, status, or any other field.
 */
export class UpdateHubNeeds {
  constructor(private readonly hubs: HubRepository) {}

  async execute(command: UpdateHubNeedsCommand): Promise<PublicHub> {
    const hub = await this.hubs.findById(command.hubId);
    if (!hub) throw new HubNotFoundError(command.hubId);
    hub.replaceNeeds(command.needs);
    await this.hubs.save(hub);
    return hub.toPublic();
  }
}
