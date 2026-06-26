import { beforeEach, describe, expect, test } from "bun:test";
import { RegisterUser } from "./register-user";
import { InMemoryUserRepository } from "../../infrastructure/persistence/in-memory-user.repository";
import { UsernameTakenError } from "../../domain/identity/errors";
import { FakeHasher } from "../../../tests/support";

describe("RegisterUser", () => {
  let users: InMemoryUserRepository;
  let register: RegisterUser;

  beforeEach(() => {
    users = new InMemoryUserRepository();
    register = new RegisterUser(users, new FakeHasher());
  });

  test("crea un usuario y devuelve su forma pública", async () => {
    const user = await register.execute({
      username: "zodi1",
      password: "password123",
      role: "ZODI",
    });
    expect(user.username).toBe("zodi1");
    expect(user.role).toBe("ZODI");
    expect(await users.findByUsername("zodi1")).not.toBeNull();
  });

  test("guarda el hash, nunca la contraseña en plano", async () => {
    await register.execute({
      username: "zodi2",
      password: "password123",
      role: "ZODI",
    });
    const stored = await users.findByUsername("zodi2");
    expect(stored!.credential.hash).toBe("hashed:password123");
    expect(stored!.credential.hash).not.toBe("password123");
  });

  test("rechaza un username ya tomado", async () => {
    await register.execute({
      username: "dup",
      password: "password123",
      role: "MANAGER",
    });
    await expect(
      register.execute({
        username: "dup",
        password: "otherpass123",
        role: "ADMIN",
      }),
    ).rejects.toBeInstanceOf(UsernameTakenError);
  });
});
