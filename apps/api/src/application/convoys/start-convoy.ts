import type { PublicConvoy } from "@sos/shared";
import { ConvoyNotFoundError } from "../../domain/convoys/errors";
import type { ConvoyRepository } from "../../domain/convoys/repositories/convoy.repository";
import type { LoteRepository } from "../../domain/cargo/repositories/lote.repository";

export interface StartConvoyCommand {
  id: string;
}

export class StartConvoy {
  constructor(
    private readonly convoys: ConvoyRepository,
    private readonly lotes: LoteRepository,
  ) {}

  async execute(command: StartConvoyCommand): Promise<PublicConvoy> {
    const convoy = await this.convoys.findById(command.id);
    if (!convoy) throw new ConvoyNotFoundError(command.id);

    convoy.dispatch();

    // Buscar y asignar el convoyId a todos los lotes en tránsito en los vehículos del convoy
    for (const vehicleId of convoy.vehicleIds) {
      const vehicleLotes = await this.lotes.findByVehicle(vehicleId);
      for (const lote of vehicleLotes) {
        lote.assignToConvoy(convoy.id);
        await this.lotes.save(lote);
      }
    }

    await this.convoys.save(convoy);
    return convoy.toPublic();
  }
}
