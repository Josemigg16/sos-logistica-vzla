import { beforeEach, describe, expect, test } from "bun:test";
import { AuthenticateUser } from "./authenticate-user";
import { RegisterUser } from "./register-user";
import { InMemoryUserRepository } from "../../infrastructure/persistence/in-memory-user.repository";
import { InMemorySessionRepository } from "../../infrastructure/persistence/in-memory-session.repository";
import { JwtTokenService } from "../../infrastructure/auth/jwt-token-service";
import {
  InvalidCredentialsError,
  UserSuspendedError,
} from "../../domain/identity/errors";
import { FakeHasher } from "../../../tests/support";

describe("AuthenticateUser", () => {
  let users: InMemoryUserRepository;
  let sessions: InMemorySessionRepository;
  let authenticate: AuthenticateUser;

  beforeEach(async () => {
    users = new InMemoryUserRepository();
    sessions = new InMemorySessionRepository();
    const hasher = new FakeHasher();
    authenticate = new AuthenticateUser(
      users,
      sessions,
      hasher,
      new JwtTokenService(),
      60_000,
    );
    await new RegisterUser(users, hasher).execute({
      username: "manager",
      password: "secret123",
      role: "MANAGER",
    });
  });

  test("credenciales correctas devuelven tokens y crean sesión", async () => {
    const result = await authenticate.execute({
      username: "manager",
      password: "secret123",
    });
    expect(result.accessToken).toBeTruthy();
    expect(result.refreshToken).toBeTruthy();
    expect(result.user.role).toBe("MANAGER");
    expect(await sessions.findByTokenHash("nope")).toBeNull();
  });

  test("contraseña incorrecta tira InvalidCredentials", async () => {
    await expect(
      authenticate.execute({ username: "manager", password: "wrong" }),
    ).rejects.toBeInstanceOf(InvalidCredentialsError);
  });

  test("usuario inexistente tira InvalidCredentials", async () => {
    await expect(
      authenticate.execute({ username: "ghost", password: "secret123" }),
    ).rejects.toBeInstanceOf(InvalidCredentialsError);
  });

  test("usuario suspendido tira UserSuspended", async () => {
    const user = await users.findByUsername("manager");
    user!.suspend();
    await users.save(user!);
    await expect(
      authenticate.execute({ username: "manager", password: "secret123" }),
    ).rejects.toBeInstanceOf(UserSuspendedError);
  });
});
