import type { LoginRequest, PublicUser } from "@sos/shared";
import type { UserRepository } from "../../domain/identity/repositories/user.repository";
import type { SessionRepository } from "../../domain/identity/repositories/session.repository";
import type { PasswordHasher } from "./ports/password-hasher";
import type { TokenService } from "./ports/token-service";
import { Session } from "../../domain/identity/entities/session";
import { InvalidCredentialsError } from "../../domain/identity/errors";

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  refreshExpiresAt: Date;
  user: PublicUser;
}

/**
 * Use case: login. Orquesta — no implementa reglas.
 * La regla "suspendido no entra" vive en el User; el hash en el hasher.
 */
export class AuthenticateUser {
  constructor(
    private readonly users: UserRepository,
    private readonly sessions: SessionRepository,
    private readonly hasher: PasswordHasher,
    private readonly tokens: TokenService,
    private readonly refreshTtlMs: number,
  ) {}

  async execute(command: LoginRequest): Promise<AuthTokens> {
    const user = await this.users.findByUsername(command.telefono);
    if (!user) throw new InvalidCredentialsError();

    user.ensureCanAuthenticate();

    const valid = await this.hasher.verify(
      command.password,
      user.credential.hash,
    );
    if (!valid) throw new InvalidCredentialsError();

    const accessToken = await this.tokens.issueAccessToken(user);
    const refresh = this.tokens.newRefreshToken();
    const session = Session.issue({
      id: crypto.randomUUID(),
      userId: user.id,
      refreshTokenHash: refresh.hash,
      expiresAt: new Date(Date.now() + this.refreshTtlMs),
    });
    await this.sessions.save(session);

    return {
      accessToken,
      refreshToken: refresh.token,
      refreshExpiresAt: session.expiresAt,
      user: user.toPublic(),
    };
  }
}
