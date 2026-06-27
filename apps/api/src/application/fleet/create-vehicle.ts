import type { CreateVehicleRequest, PublicVehicle } from "@sos/shared";
import type { VehicleRepository } from "../../domain/fleet/repositories/vehicle.repository";
import { Vehicle } from "../../domain/fleet/entities/vehicle";
import { PlacaTakenError } from "../../domain/fleet/errors";

export class CreateVehicle {
  constructor(private readonly vehicles: VehicleRepository) {}

  async execute(command: CreateVehicleRequest): Promise<PublicVehicle> {
    const all = await this.vehicles.findAll();
    if (all.some((v) => v.placa === command.placa)) throw new PlacaTakenError(command.placa);
    const vehicle = Vehicle.create({ id: crypto.randomUUID(), ...command });
    await this.vehicles.save(vehicle);
    return vehicle.toPublic();
  }
}
