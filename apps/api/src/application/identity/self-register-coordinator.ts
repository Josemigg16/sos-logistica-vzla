import type { SignupRequest, SignupResult } from "@sos/shared";
import type { UserRepository } from "../../domain/identity/repositories/user.repository";
import type { PasswordHasher } from "./ports/password-hasher";
import { User } from "../../domain/identity/entities/user";
import { Credential } from "../../domain/identity/value-objects/credential";
import { Role } from "../../domain/identity/value-objects/role";
import { UsernameTakenError, CedulaTakenError } from "../../domain/identity/errors";

const PASSWORD_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generatePassword(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(5));
  return Array.from(bytes, (b) => PASSWORD_CHARS[b % PASSWORD_CHARS.length]).join("");
}

export class SelfRegisterCoordinator {
  constructor(
    private readonly users: UserRepository,
    private readonly hasher: PasswordHasher,
  ) {}

  async execute(command: SignupRequest): Promise<SignupResult> {
    const byUsername = await this.users.findByUsername(command.telefono);
    if (byUsername) throw new UsernameTakenError(command.telefono);

    const fullCedula = command.cedula
      ? command.documentType
        ? `${command.documentType}-${command.cedula}`
        : command.cedula
      : null;

    if (fullCedula) {
      const byCedula = await this.users.findByCedula(fullCedula);
      if (byCedula) throw new CedulaTakenError(fullCedula);
    }

    const generatedPassword = command.password ? null : generatePassword();
    const hash = await this.hasher.hash(command.password ?? generatedPassword!);
    const user = User.register({
      id: crypto.randomUUID(),
      username: command.telefono,
      credential: Credential.fromHash(hash),
      role: Role.create("HUB_COORDINATOR"),
      cedula: fullCedula,
      telefono: command.telefono,
    });
    await this.users.save(user);

    return { user: user.toPublic(), generatedPassword: generatedPassword };
  }
}
