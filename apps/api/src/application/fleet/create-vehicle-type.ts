import type { CreateVehicleTypeRequest, PublicVehicleType } from "@sos/shared";
import type { VehicleTypeRepository } from "../../domain/fleet/repositories/vehicle-type.repository";
import { VehicleType } from "../../domain/fleet/entities/vehicle-type";

export class CreateVehicleType {
  constructor(private readonly vehicleTypes: VehicleTypeRepository) {}

  async execute(command: CreateVehicleTypeRequest): Promise<PublicVehicleType> {
    const vehicleType = VehicleType.create({
      id: crypto.randomUUID(),
      nombre: command.nombre,
      descripcion: command.descripcion ?? "",
    });
    await this.vehicleTypes.save(vehicleType);
    return vehicleType.toPublic();
  }
}
