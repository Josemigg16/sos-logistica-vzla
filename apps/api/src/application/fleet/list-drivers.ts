import type { PublicDriver } from "@sos/shared";
import type { DriverRepository } from "../../domain/fleet/repositories/driver.repository";

export class ListDrivers {
  constructor(private readonly drivers: DriverRepository) {}

  async execute(): Promise<PublicDriver[]> {
    const all = await this.drivers.findAll();
    return all.map((d) => d.toPublic());
  }
}
