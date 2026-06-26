import type { PublicUser, UserStatus } from "@sos/shared";
import { Credential } from "../value-objects/credential";
import { Role } from "../value-objects/role";
import { UserSuspendedError } from "../errors";

export interface UserProps {
  id: string;
  username: string;
  credential: Credential;
  role: Role;
  status: UserStatus;
  email: string | null;
  createdAt: Date;
}

/**
 * Entidad / Aggregate Root del bounded context `identity`.
 * Tiene identidad (id) y ciclo de vida. Guarda sus propias invariantes.
 */
export class User {
  private constructor(private props: UserProps) {}

  static rehydrate(props: UserProps): User {
    return new User(props);
  }

  static register(input: {
    id: string;
    username: string;
    credential: Credential;
    role: Role;
    email?: string | null;
  }): User {
    return new User({
      id: input.id,
      username: input.username,
      credential: input.credential,
      role: input.role,
      status: "ACTIVE",
      email: input.email ?? null,
      createdAt: new Date(),
    });
  }

  get id(): string {
    return this.props.id;
  }
  get username(): string {
    return this.props.username;
  }
  get credential(): Credential {
    return this.props.credential;
  }
  get role(): Role {
    return this.props.role;
  }
  get status(): UserStatus {
    return this.props.status;
  }
  get email(): string | null {
    return this.props.email;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }

  get isActive(): boolean {
    return this.props.status === "ACTIVE";
  }

  /** Invariante de negocio: un usuario suspendido no puede autenticarse. */
  ensureCanAuthenticate(): void {
    if (!this.isActive) throw new UserSuspendedError(this.id);
  }

  suspend(): void {
    this.props.status = "SUSPENDED";
  }

  toPublic(): PublicUser {
    return {
      id: this.props.id,
      username: this.props.username,
      role: this.props.role.value,
      email: this.props.email,
    };
  }
}
