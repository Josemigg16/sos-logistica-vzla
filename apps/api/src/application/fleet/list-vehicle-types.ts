import type { PublicVehicleType } from "@sos/shared";
import type { VehicleTypeRepository } from "../../domain/fleet/repositories/vehicle-type.repository";

export class ListVehicleTypes {
  constructor(private readonly vehicleTypes: VehicleTypeRepository) {}

  async execute(): Promise<PublicVehicleType[]> {
    const types = await this.vehicleTypes.findAll();
    return types.map((t) => t.toPublic());
  }
}
