import type { UpdateVehicleTypeRequest, PublicVehicleType } from "@sos/shared";
import type { VehicleTypeRepository } from "../../domain/fleet/repositories/vehicle-type.repository";
import { VehicleTypeNotFoundError } from "../../domain/fleet/errors";

export class UpdateVehicleType {
  constructor(private readonly vehicleTypes: VehicleTypeRepository) {}

  async execute(id: string, command: UpdateVehicleTypeRequest): Promise<PublicVehicleType> {
    const vehicleType = await this.vehicleTypes.findById(id);
    if (!vehicleType) throw new VehicleTypeNotFoundError(id);
    vehicleType.update(command);
    await this.vehicleTypes.save(vehicleType);
    return vehicleType.toPublic();
  }
}
