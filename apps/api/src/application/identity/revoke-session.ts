import type { SessionRepository } from "../../domain/identity/repositories/session.repository";
import type { TokenService } from "./ports/token-service";

/**
 * Use case: logout. Revoca la sesión asociada al refresh token presentado.
 * Idempotente: si no hay token o la sesión no existe, no hace nada.
 */
export class RevokeSession {
  constructor(
    private readonly sessions: SessionRepository,
    private readonly tokens: TokenService,
  ) {}

  async execute(rawRefreshToken: string | undefined): Promise<void> {
    if (!rawRefreshToken) return;

    const hash = this.tokens.hashRefreshToken(rawRefreshToken);
    const session = await this.sessions.findByTokenHash(hash);
    if (!session) return;

    session.revoke();
    await this.sessions.save(session);
  }
}
