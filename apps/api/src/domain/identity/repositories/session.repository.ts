import type { Session } from "../entities/session";

export interface SessionRepository {
  findByTokenHash(refreshTokenHash: string): Promise<Session | null>;
  save(session: Session): Promise<void>;
  revokeAllForUser(userId: string): Promise<void>;
}
