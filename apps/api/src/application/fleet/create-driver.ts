import type { CreateDriverRequest, PublicDriver } from "@sos/shared";
import type { UserRepository } from "../../domain/identity/repositories/user.repository";
import type { DriverRepository } from "../../domain/fleet/repositories/driver.repository";
import type { PasswordHasher } from "../identity/ports/password-hasher";
import { User } from "../../domain/identity/entities/user";
import { Credential } from "../../domain/identity/value-objects/credential";
import { Role } from "../../domain/identity/value-objects/role";
import { Driver } from "../../domain/fleet/entities/driver";
import { UsernameTakenError } from "../../domain/identity/errors";

export class CreateDriver {
  constructor(
    private readonly users: UserRepository,
    private readonly drivers: DriverRepository,
    private readonly hasher: PasswordHasher,
  ) {}

  async execute(command: CreateDriverRequest): Promise<PublicDriver> {
    const existing = await this.users.findByUsername(command.username);
    if (existing) throw new UsernameTakenError(command.username);

    const hash = await this.hasher.hash(command.password);
    const userId = crypto.randomUUID();
    const user = User.register({
      id: userId,
      username: command.username,
      credential: Credential.fromHash(hash),
      role: Role.create("DRIVER"),
    });
    await this.users.save(user);

    const driver = Driver.create({
      id: userId,
      username: command.username,
      licencia: command.licencia,
      telefono: command.telefono,
    });
    await this.drivers.save(driver);
    return driver.toPublic();
  }
}
