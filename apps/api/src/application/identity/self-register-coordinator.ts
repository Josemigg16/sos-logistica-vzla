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

    const fullCedula = command.cedula
      ? command.documentType
        ? `${command.documentType}-${command.cedula}`
        : command.cedula
      : null;

    if (fullCedula) {
      const byCedula = await this.users.findByCedula(fullCedula);
      if (byCedula) throw new CedulaTakenError(fullCedula);
    }

    const hash = await this.hasher.hash(command.password);
    const user = User.register({
      id: crypto.randomUUID(),
      username: command.username,
      credential: Credential.fromHash(hash),
      role: Role.create("HUB_COORDINATOR"),
      cedula: fullCedula,
      telefono: command.telefono ?? null,
    });
    await this.users.save(user);
    return user.toPublic();
  }
}
