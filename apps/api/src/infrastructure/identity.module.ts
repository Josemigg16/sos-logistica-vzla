import { AuthenticateUser } from "../application/identity/authenticate-user";
import { RegisterUser } from "../application/identity/register-user";
import { RefreshSession } from "../application/identity/refresh-session";
import { RevokeSession } from "../application/identity/revoke-session";
import { DrizzleUserRepository } from "./persistence/drizzle-user.repository";
import { DrizzleSessionRepository } from "./persistence/drizzle-session.repository";
import { BunPasswordHasher } from "./auth/bun-password-hasher";
import { JwtTokenService } from "./auth/jwt-token-service";
import { createAuthRoutes } from "./http/auth.routes";
import { config } from "../config";

/**
 * Composition root del bounded context `identity`: acá se cablean las
 * implementaciones concretas a los puertos. Único lugar que conoce a todos.
 */
export function createIdentityModule() {
  const users = new DrizzleUserRepository();
  const sessions = new DrizzleSessionRepository();
  const hasher = new BunPasswordHasher();
  const tokens = new JwtTokenService();

  const useCases = {
    registerUser: new RegisterUser(users, hasher),
    authenticateUser: new AuthenticateUser(
      users,
      sessions,
      hasher,
      tokens,
      config.refreshTokenTtlMs,
    ),
    refreshSession: new RefreshSession(
      users,
      sessions,
      tokens,
      config.refreshTokenTtlMs,
    ),
    revokeSession: new RevokeSession(sessions, tokens),
  };

  return {
    useCases,
    routes: createAuthRoutes({ ...useCases, userRepo: users, hasher }),
  };
}
