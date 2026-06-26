import type { SessionRepository } from "../../domain/identity/repositories/session.repository";
import type { Session } from "../../domain/identity/entities/session";

/**
 * Adapter in-memory del puerto SessionRepository. Espejo del de Drizzle.
 */
export class InMemorySessionRepository implements SessionRepository {
  private readonly byId = new Map<string, Session>();

  async findByTokenHash(refreshTokenHash: string): Promise<Session | null> {
    for (const session of this.byId.values()) {
      if (session.refreshTokenHash === refreshTokenHash) return session;
    }
    return null;
  }

  async save(session: Session): Promise<void> {
    this.byId.set(session.id, session);
  }

  async revokeAllForUser(userId: string): Promise<void> {
    for (const session of this.byId.values()) {
      if (session.userId === userId && session.revokedAt === null) {
        session.revoke();
      }
    }
  }
}
