import type { SignupRequest, PublicUser } from "@sos/shared";
import type { UserRepository } from "../../domain/identity/repositories/user.repository";
import type { PasswordHasher } from "./ports/password-hasher";
import { User } from "../../domain/identity/entities/user";
import { Credential } from "../../domain/identity/value-objects/credential";
import { Role } from "../../domain/identity/value-objects/role";
import { UsernameTakenError, CedulaTakenError } from "../../domain/identity/errors";

export class SelfRegisterCoordinator {
  constructor(
    private readonly users: UserRepository,
    private readonly hasher: PasswordHasher,
  ) {}

  async execute(command: SignupRequest): Promise<PublicUser> {
    const byUsername = await this.users.findByUsername(command.username);
    if (byUsername) throw new UsernameTakenError(command.username);

    const byCedula = await this.users.findByCedula(command.cedula);
    if (byCedula) throw new CedulaTakenError(command.cedula);

    const hash = await this.hasher.hash(command.password);
    const user = User.register({
      id: crypto.randomUUID(),
      username: command.username,
      credential: Credential.fromHash(hash),
      role: Role.create("HUB_COORDINATOR"),
      cedula: command.cedula,
      telefono: command.telefono,
    });
    await this.users.save(user);
    return user.toPublic();
  }
}
