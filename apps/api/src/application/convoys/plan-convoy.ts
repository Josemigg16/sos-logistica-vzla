import type { CreateConvoyRequest, PublicConvoy } from "@sos/shared";
import { Convoy } from "../../domain/convoys/entities/convoy";
import { ConvoyError } from "../../domain/convoys/errors";
import type { ConvoyRepository } from "../../domain/convoys/repositories/convoy.repository";
import type { HubRepository } from "../../domain/resources/repositories/hub.repository";

export class PlanConvoy {
  constructor(
    private readonly convoys: ConvoyRepository,
    private readonly hubs: HubRepository,
  ) {}

  async execute(command: CreateConvoyRequest): Promise<PublicConvoy> {
    const origin = await this.hubs.findById(command.origenId);
    if (!origin) {
      throw new ConvoyError("No se encontró el hub de origen", "ORIGIN_HUB_NOT_FOUND");
    }

    if (origin.type !== "DISPATCH") {
      throw new ConvoyError("El hub de origen debe ser de despacho", "ORIGIN_NOT_DISPATCH");
    }

    if (!origin.isActive) {
      throw new ConvoyError("El hub de origen está inactivo", "ORIGIN_HUB_INACTIVE");
    }

    const destination = await this.hubs.findById(command.destinoId);
    if (!destination) {
      throw new ConvoyError("No se encontró el hub de destino", "DESTINATION_HUB_NOT_FOUND");
    }

    if (destination.type !== "DESTINATION") {
      throw new ConvoyError("El hub de destino debe ser de destino", "DESTINATION_NOT_DESTINATION");
    }

    if (!destination.isActive) {
      throw new ConvoyError("El hub de destino está inactivo", "DESTINATION_HUB_INACTIVE");
    }

    const convoy = Convoy.create({ id: crypto.randomUUID(), ...command });
    await this.convoys.save(convoy);
    return convoy.toPublic();
  }
}
