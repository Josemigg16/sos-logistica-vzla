import type { UserRepository } from "../../domain/identity/repositories/user.repository";
import type { SessionRepository } from "../../domain/identity/repositories/session.repository";
import type { TokenService } from "./ports/token-service";
import { Session } from "../../domain/identity/entities/session";
import { InvalidRefreshTokenError } from "../../domain/identity/errors";

export interface RefreshedTokens {
  accessToken: string;
  refreshToken: string;
  refreshExpiresAt: Date;
}

/**
 * Use case: canjea un refresh token por un access nuevo, ROTANDO el refresh.
 * Si llega un refresh ya rotado (revocado pero existente) lo tratamos como
 * reuso → revocamos toda la cadena del usuario. Esto detecta robo de token.
 */
export class RefreshSession {
  constructor(
    private readonly users: UserRepository,
    private readonly sessions: SessionRepository,
    private readonly tokens: TokenService,
    private readonly refreshTtlMs: number,
  ) {}

  async execute(rawRefreshToken: string): Promise<RefreshedTokens> {
    const hash = this.tokens.hashRefreshToken(rawRefreshToken);
    const session = await this.sessions.findByTokenHash(hash);

    if (!session) throw new InvalidRefreshTokenError();

    if (!session.isActive) {
      // Reuso de un token ya rotado → posible robo. Cortamos todo.
      await this.sessions.revokeAllForUser(session.userId);
      throw new InvalidRefreshTokenError();
    }

    const user = await this.users.findById(session.userId);
    if (!user || !user.isActive) throw new InvalidRefreshTokenError();

    // Rotación: revocamos la sesión usada y emitimos una nueva.
    session.revoke();
    await this.sessions.save(session);

    const accessToken = await this.tokens.issueAccessToken(user);
    const refresh = this.tokens.newRefreshToken();
    const next = Session.issue({
      id: crypto.randomUUID(),
      userId: user.id,
      refreshTokenHash: refresh.hash,
      expiresAt: new Date(Date.now() + this.refreshTtlMs),
    });
    await this.sessions.save(next);

    return {
      accessToken,
      refreshToken: refresh.token,
      refreshExpiresAt: next.expiresAt,
    };
  }
}
