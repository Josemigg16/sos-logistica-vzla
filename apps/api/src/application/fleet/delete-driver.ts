import type { DriverRepository } from "../../domain/fleet/repositories/driver.repository";
import { DriverNotFoundError } from "../../domain/fleet/errors";

export class DeleteDriver {
  constructor(private readonly drivers: DriverRepository) {}

  async execute(id: string): Promise<void> {
    const existing = await this.drivers.findById(id);
    if (!existing) throw new DriverNotFoundError(id);
    await this.drivers.delete(id);
  }
}
