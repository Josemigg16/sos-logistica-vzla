import type { Vehicle } from "../entities/vehicle";

export interface VehicleRepository {
  findById(id: string): Promise<Vehicle | null>;
  findAll(): Promise<Vehicle[]>;
  save(vehicle: Vehicle): Promise<void>;
  delete(id: string): Promise<void>;
}
