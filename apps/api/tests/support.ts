import type { PasswordHasher } from "../src/application/identity/ports/password-hasher";
import { AuthenticateUser } from "../src/application/identity/authenticate-user";
import { RegisterUser } from "../src/application/identity/register-user";
import { SelfRegisterCoordinator } from "../src/application/identity/self-register-coordinator";
import { RefreshSession } from "../src/application/identity/refresh-session";
import { RevokeSession } from "../src/application/identity/revoke-session";
import { InMemoryUserRepository } from "../src/infrastructure/persistence/in-memory-user.repository";
import { InMemorySessionRepository } from "../src/infrastructure/persistence/in-memory-session.repository";
import { JwtTokenService } from "../src/infrastructure/auth/jwt-token-service";
import { createAuthRoutes } from "../src/infrastructure/http/auth.routes";

/** Hasher determinista para tests unitarios (sin el costo de argon2id). */
export class FakeHasher implements PasswordHasher {
  async hash(plain: string): Promise<string> {
    return `hashed:${plain}`;
  }
  async verify(plain: string, hash: string): Promise<boolean> {
    return hash === `hashed:${plain}`;
  }
}

const TEST_REFRESH_TTL_MS = 1000 * 60 * 60; // 1h

/**
 * Arma el bounded context `identity` con repos in-memory y un ADMIN ya
 * sembrado. Cablea los use cases reales sobre las rutas Hono reales.
 */
export async function buildAuthApp() {
  const users = new InMemoryUserRepository();
  const sessions = new InMemorySessionRepository();
  const hasher = new FakeHasher();
  const tokens = new JwtTokenService();

  const useCases = {
    registerUser: new RegisterUser(users, hasher),
    selfRegisterCoordinator: new SelfRegisterCoordinator(users, hasher),
    authenticateUser: new AuthenticateUser(
      users,
      sessions,
      hasher,
      tokens,
      TEST_REFRESH_TTL_MS,
    ),
    refreshSession: new RefreshSession(
      users,
      sessions,
      tokens,
      TEST_REFRESH_TTL_MS,
    ),
    revokeSession: new RevokeSession(sessions, tokens),
  };

  await useCases.registerUser.execute({
    username: "admin",
    password: "adminpass123",
    role: "ADMIN",
  });

  return { app: createAuthRoutes({ ...useCases, userRepo: users, hasher }), users, sessions };
}

/** Extrae el par `refresh_token=valor` de un header Set-Cookie. */
export function extractRefreshCookie(setCookie: string | null): string {
  if (!setCookie) throw new Error("No vino Set-Cookie");
  const match = setCookie.match(/refresh_token=([^;]+)/);
  if (!match) throw new Error("No se encontró refresh_token en la cookie");
  return `refresh_token=${match[1]}`;
}
