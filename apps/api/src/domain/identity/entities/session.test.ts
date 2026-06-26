import { describe, expect, test } from "bun:test";
import { Session } from "./session";

function issue(expiresInMs: number) {
  return Session.issue({
    id: "s-1",
    userId: "u-1",
    refreshTokenHash: "abc",
    expiresAt: new Date(Date.now() + expiresInMs),
  });
}

describe("Session", () => {
  test("recién emitida y vigente está activa", () => {
    expect(issue(60_000).isActive).toBe(true);
  });

  test("una sesión expirada no está activa", () => {
    expect(issue(-1_000).isActive).toBe(false);
  });

  test("revocar la desactiva y es idempotente", () => {
    const session = issue(60_000);
    session.revoke();
    const firstRevokedAt = session.revokedAt;
    expect(session.isActive).toBe(false);
    session.revoke();
    expect(session.revokedAt).toBe(firstRevokedAt);
  });
});
