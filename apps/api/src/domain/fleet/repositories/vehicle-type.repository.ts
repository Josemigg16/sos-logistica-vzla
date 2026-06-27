import type { VehicleType } from "../entities/vehicle-type";

export interface VehicleTypeRepository {
  findById(id: string): Promise<VehicleType | null>;
  findAll(): Promise<VehicleType[]>;
  save(vehicleType: VehicleType): Promise<void>;
  delete(id: string): Promise<void>;
}
