import type { PublicUser, RegisterRequest } from "@sos/shared";
import type { UserRepository } from "../../domain/identity/repositories/user.repository";
import type { PasswordHasher } from "./ports/password-hasher";
import { User } from "../../domain/identity/entities/user";
import { Credential } from "../../domain/identity/value-objects/credential";
import { Role } from "../../domain/identity/value-objects/role";
import { UsernameTakenError } from "../../domain/identity/errors";

export class RegisterUser {
  constructor(
    private readonly users: UserRepository,
    private readonly hasher: PasswordHasher,
  ) {}

  async execute(command: RegisterRequest): Promise<PublicUser> {
    const existing = await this.users.findByUsername(command.telefono);
    if (existing) throw new UsernameTakenError(command.telefono);

    const hash = await this.hasher.hash(command.password);
    const user = User.register({
      id: crypto.randomUUID(),
      username: command.telefono,
      credential: Credential.fromHash(hash),
      role: Role.create(command.role),
      email: command.email ?? null,
      telefono: command.telefono,
    });
    await this.users.save(user);

    return user.toPublic();
  }
}
