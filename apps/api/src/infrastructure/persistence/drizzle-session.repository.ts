import { and, eq, isNull } from "drizzle-orm";
import { db } from "./db";
import { sessions } from "./schema";
import type { SessionRepository } from "../../domain/identity/repositories/session.repository";
import { Session } from "../../domain/identity/entities/session";

type SessionRow = typeof sessions.$inferSelect;

function toDomain(row: SessionRow): Session {
  return Session.rehydrate({
    id: row.id,
    userId: row.userId,
    refreshTokenHash: row.refreshTokenHash,
    expiresAt: row.expiresAt,
    createdAt: row.createdAt,
    revokedAt: row.revokedAt,
  });
}

export class DrizzleSessionRepository implements SessionRepository {
  async findByTokenHash(refreshTokenHash: string): Promise<Session | null> {
    const [row] = await db
      .select()
      .from(sessions)
      .where(eq(sessions.refreshTokenHash, refreshTokenHash))
      .limit(1);
    return row ? toDomain(row) : null;
  }

  async save(session: Session): Promise<void> {
    await db
      .insert(sessions)
      .values({
        id: session.id,
        userId: session.userId,
        refreshTokenHash: session.refreshTokenHash,
        expiresAt: session.expiresAt,
        createdAt: session.createdAt,
        revokedAt: session.revokedAt,
      })
      .onConflictDoUpdate({
        target: sessions.id,
        set: { revokedAt: session.revokedAt },
      });
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await db
      .update(sessions)
      .set({ revokedAt: new Date() })
      .where(and(eq(sessions.userId, userId), isNull(sessions.revokedAt)));
  }
}
