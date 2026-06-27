import type { DriverRepository } from "../../domain/fleet/repositories/driver.repository";
import type { Driver } from "../../domain/fleet/entities/driver";

export class InMemoryDriverRepository implements DriverRepository {
  private store = new Map<string, Driver>();

  async findById(id: string): Promise<Driver | null> {
    return this.store.get(id) ?? null;
  }
  async findAll(): Promise<Driver[]> {
    return Array.from(this.store.values());
  }
  async save(driver: Driver): Promise<void> {
    this.store.set(driver.id, driver);
  }
  async delete(id: string): Promise<void> {
    this.store.delete(id);
  }
}
