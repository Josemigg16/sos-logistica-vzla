import type { VehicleRepository } from "../../domain/fleet/repositories/vehicle.repository";
import type { Vehicle } from "../../domain/fleet/entities/vehicle";

export class InMemoryVehicleRepository implements VehicleRepository {
  private store = new Map<string, Vehicle>();

  async findById(id: string): Promise<Vehicle | null> {
    return this.store.get(id) ?? null;
  }
  async findAll(): Promise<Vehicle[]> {
    return Array.from(this.store.values());
  }
  async save(vehicle: Vehicle): Promise<void> {
    this.store.set(vehicle.id, vehicle);
  }
  async delete(id: string): Promise<void> {
    this.store.delete(id);
  }
}
