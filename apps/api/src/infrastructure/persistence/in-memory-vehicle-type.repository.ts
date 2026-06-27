import type { VehicleTypeRepository } from "../../domain/fleet/repositories/vehicle-type.repository";
import type { VehicleType } from "../../domain/fleet/entities/vehicle-type";

export class InMemoryVehicleTypeRepository implements VehicleTypeRepository {
  private store = new Map<string, VehicleType>();

  async findById(id: string): Promise<VehicleType | null> {
    return this.store.get(id) ?? null;
  }
  async findAll(): Promise<VehicleType[]> {
    return Array.from(this.store.values());
  }
  async save(vehicleType: VehicleType): Promise<void> {
    this.store.set(vehicleType.id, vehicleType);
  }
  async delete(id: string): Promise<void> {
    this.store.delete(id);
  }
}
