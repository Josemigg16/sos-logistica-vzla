import type { VehicleTypeRepository } from "../../domain/fleet/repositories/vehicle-type.repository";
import { VehicleTypeNotFoundError } from "../../domain/fleet/errors";

export class DeleteVehicleType {
  constructor(private readonly vehicleTypes: VehicleTypeRepository) {}

  async execute(id: string): Promise<void> {
    const existing = await this.vehicleTypes.findById(id);
    if (!existing) throw new VehicleTypeNotFoundError(id);
    await this.vehicleTypes.delete(id);
  }
}
