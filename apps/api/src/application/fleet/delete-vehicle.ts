import type { VehicleRepository } from "../../domain/fleet/repositories/vehicle.repository";
import { VehicleNotFoundError } from "../../domain/fleet/errors";

export class DeleteVehicle {
  constructor(private readonly vehicles: VehicleRepository) {}

  async execute(id: string): Promise<void> {
    const existing = await this.vehicles.findById(id);
    if (!existing) throw new VehicleNotFoundError(id);
    await this.vehicles.delete(id);
  }
}
