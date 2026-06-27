import type { CreateHubRequest, HubStatus, PublicHub } from "@sos/shared";
import type { HubRepository } from "../../domain/resources/repositories/hub.repository";
import { Hub } from "../../domain/resources/entities/hub";

/**
 * Use case: registrar un centro de acopio. Opcionalmente queda asociado al
 * coordinador que lo crea (auto-registro de un Coord. Centro).
 *
 * El caller decide el `status` inicial: los hubs propuestos por terceros
 * (público, coordinadores) arrancan INACTIVO hasta verificación; el alta
 * directa por admin puede arrancar ACTIVO.
 */
export class RegisterHub {
  constructor(private readonly hubs: HubRepository) {}

  async execute(
    command: CreateHubRequest & {
      coordinatorId?: string | null;
      status?: HubStatus;
    },
  ): Promise<PublicHub> {
    const hub = Hub.register({ id: crypto.randomUUID(), ...command });
    await this.hubs.save(hub);
    return hub.toPublic();
  }
}
