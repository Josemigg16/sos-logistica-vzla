import type { AddVehicleRequest, PublicConvoy } from "@sos/shared";
import { ConvoyNotFoundError } from "../../domain/convoys/errors";
import type { ConvoyRepository } from "../../domain/convoys/repositories/convoy.repository";

export type AddVehicleToConvoyInput = AddVehicleRequest & {
  convoyId: string;
};

export class AddVehicleToConvoy {
  constructor(private readonly convoys: ConvoyRepository) {}

  async execute(input: AddVehicleToConvoyInput): Promise<PublicConvoy> {
    const convoy = await this.convoys.findById(input.convoyId);
    if (!convoy) throw new ConvoyNotFoundError(input.convoyId);

    convoy.addVehicle(input.vehicleId);
    await this.convoys.save(convoy);

    return convoy.toPublic();
  }
}
