import type { HubType, PublicHub } from "@sos/shared";
import type { HubRepository } from "../../domain/resources/repositories/hub.repository";
import { Hub } from "../../domain/resources/entities/hub";

export interface UpsertHubCommand {
  id: string;
  name: string;
  address: string;
  contact: string;
  type: HubType;
  latitude: number;
  longitude: number;
}

/**
 * Use case: create-or-update a hub with a client-supplied id.
 * The repository save() is idempotent (onConflictDoUpdate at the DB level).
 */
export class UpsertHub {
  constructor(private readonly hubs: HubRepository) {}

  async execute(command: UpsertHubCommand): Promise<PublicHub> {
    const hub = Hub.register(command);
    await this.hubs.save(hub);
    return hub.toPublic();
  }
}
