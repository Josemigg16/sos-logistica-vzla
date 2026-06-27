import type { CreateDriverRequest, PublicDriver } from "@sos/shared";
import type { DriverRepository } from "../../domain/fleet/repositories/driver.repository";
import { Driver } from "../../domain/fleet/entities/driver";

export class CreateDriver {
  constructor(private readonly drivers: DriverRepository) {}

  async execute(command: CreateDriverRequest): Promise<PublicDriver> {
    const driver = Driver.create({
      id: crypto.randomUUID(),
      nombre: command.nombre,
      apellido: command.apellido,
      cedula: command.cedula,
      licencia: command.licencia,
      telefono: command.telefono,
    });
    await this.drivers.save(driver);
    return driver.toPublic();
  }
}
