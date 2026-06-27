import type { Driver } from "../entities/driver";

export interface DriverRepository {
  findById(id: string): Promise<Driver | null>;
  findAll(): Promise<Driver[]>;
  save(driver: Driver): Promise<void>;
  delete(id: string): Promise<void>;
}
