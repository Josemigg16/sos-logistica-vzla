import type { PublicUser, RegisterRequest } from "@sos/shared";
import type { UserRepository } from "../../domain/identity/repositories/user.repository";
import type { PasswordHasher } from "./ports/password-hasher";
import { User } from "../../domain/identity/entities/user";
import { Credential } from "../../domain/identity/value-objects/credential";
import { Role } from "../../domain/identity/value-objects/role";
import { UsernameTakenError } from "../../domain/identity/errors";

/**
 * Use case: alta de usuario. La provisiona un ADMIN (no hay auto-registro).
 */
export class RegisterUser {
  constructor(
    private readonly users: UserRepository,
    private readonly hasher: PasswordHasher,
  ) {}

  async execute(command: RegisterRequest): Promise<PublicUser> {
    const existing = await this.users.findByUsername(command.username);
    if (existing) throw new UsernameTakenError(command.username);

    const hash = await this.hasher.hash(command.password);
    const user = User.register({
      id: crypto.randomUUID(),
      username: command.username,
      credential: Credential.fromHash(hash),
      role: Role.create(command.role),
      email: command.email ?? null,
    });
    await this.users.save(user);

    return user.toPublic();
  }
}
