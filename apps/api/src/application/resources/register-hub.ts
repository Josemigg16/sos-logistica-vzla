import type { CreateHubRequest, PublicHub } from "@sos/shared";
import type { HubRepository } from "../../domain/resources/repositories/hub.repository";
import { Hub } from "../../domain/resources/entities/hub";

/**
 * Use case: registrar un centro de acopio.
 */
export class RegisterHub {
  constructor(private readonly hubs: HubRepository) {}

  async execute(command: CreateHubRequest): Promise<PublicHub> {
    const hub = Hub.register({ id: crypto.randomUUID(), ...command });
    await this.hubs.save(hub);
    return hub.toPublic();
  }
}
