import type { UpdateVehicleRequest, PublicVehicle } from "@sos/shared";
import type { VehicleRepository } from "../../domain/fleet/repositories/vehicle.repository";
import { VehicleNotFoundError } from "../../domain/fleet/errors";

export class UpdateVehicle {
  constructor(private readonly vehicles: VehicleRepository) {}

  async execute(id: string, command: UpdateVehicleRequest): Promise<PublicVehicle> {
    const vehicle = await this.vehicles.findById(id);
    if (!vehicle) throw new VehicleNotFoundError(id);
    vehicle.update(command);
    await this.vehicles.save(vehicle);
    return vehicle.toPublic();
  }
}
