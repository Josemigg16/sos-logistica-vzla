import type { UpdateDriverRequest, PublicDriver } from "@sos/shared";
import type { DriverRepository } from "../../domain/fleet/repositories/driver.repository";
import { DriverNotFoundError } from "../../domain/fleet/errors";

export class UpdateDriver {
  constructor(private readonly drivers: DriverRepository) {}

  async execute(id: string, command: UpdateDriverRequest): Promise<PublicDriver> {
    const driver = await this.drivers.findById(id);
    if (!driver) throw new DriverNotFoundError(id);
    driver.update(command);
    await this.drivers.save(driver);
    return driver.toPublic();
  }
}
