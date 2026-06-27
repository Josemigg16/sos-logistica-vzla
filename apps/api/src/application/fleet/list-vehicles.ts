import type { PublicVehicle } from "@sos/shared";
import type { VehicleRepository } from "../../domain/fleet/repositories/vehicle.repository";

export class ListVehicles {
  constructor(private readonly vehicles: VehicleRepository) {}

  async execute(): Promise<PublicVehicle[]> {
    const all = await this.vehicles.findAll();
    return all.map((v) => v.toPublic());
  }
}
