import { beforeEach, describe, expect, test } from "bun:test";
import { AuthenticateUser } from "./authenticate-user";
import { RefreshSession } from "./refresh-session";
import { RegisterUser } from "./register-user";
import { InMemoryUserRepository } from "../../infrastructure/persistence/in-memory-user.repository";
import { InMemorySessionRepository } from "../../infrastructure/persistence/in-memory-session.repository";
import { JwtTokenService } from "../../infrastructure/auth/jwt-token-service";
import { InvalidRefreshTokenError } from "../../domain/identity/errors";
import { FakeHasher } from "../../../tests/support";

describe("RefreshSession", () => {
  let users: InMemoryUserRepository;
  let sessions: InMemorySessionRepository;
  let authenticate: AuthenticateUser;
  let refresh: RefreshSession;

  beforeEach(async () => {
    users = new InMemoryUserRepository();
    sessions = new InMemorySessionRepository();
    const hasher = new FakeHasher();
    const tokens = new JwtTokenService();
    authenticate = new AuthenticateUser(users, sessions, hasher, tokens, 60_000);
    refresh = new RefreshSession(users, sessions, tokens, 60_000);
    await new RegisterUser(users, hasher).execute({
      username: "manager",
      password: "secret123",
      role: "MANAGER",
    });
  });

  async function login() {
    return authenticate.execute({ username: "manager", password: "secret123" });
  }

  test("rota el refresh: emite uno nuevo y revoca el anterior", async () => {
    const { refreshToken } = await login();
    const rotated = await refresh.execute(refreshToken);
    expect(rotated.accessToken).toBeTruthy();
    expect(rotated.refreshToken).not.toBe(refreshToken);
  });

  test("reusar un refresh ya rotado corta toda la cadena", async () => {
    const { refreshToken } = await login();
    const rotated = await refresh.execute(refreshToken);

    // reuso del viejo -> falla y revoca todo
    await expect(refresh.execute(refreshToken)).rejects.toBeInstanceOf(
      InvalidRefreshTokenError,
    );
    // tras el reuso, hasta el nuevo queda revocado
    await expect(refresh.execute(rotated.refreshToken)).rejects.toBeInstanceOf(
      InvalidRefreshTokenError,
    );
  });

  test("un refresh desconocido es inválido", async () => {
    await expect(refresh.execute("no-existe")).rejects.toBeInstanceOf(
      InvalidRefreshTokenError,
    );
  });
});
