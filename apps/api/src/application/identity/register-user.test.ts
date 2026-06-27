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
      telefono: "+584141000001",
      password: "password123",
      role: "ZODI_SENDER",
    });
    expect(user.username).toBe("+584141000001");
    expect(user.role).toBe("ZODI_SENDER");
    expect(await users.findByUsername("+584141000001")).not.toBeNull();
  });

  test("guarda el hash, nunca la contraseña en plano", async () => {
    await register.execute({
      telefono: "+584141000002",
      password: "password123",
      role: "ZODI_DESTINATION",
    });
    const stored = await users.findByUsername("+584141000002");
    expect(stored!.credential.hash).toBe("hashed:password123");
    expect(stored!.credential.hash).not.toBe("password123");
  });

  test("escribe el telefono en ambas columnas: username y telefono", async () => {
    await register.execute({
      telefono: "+584141000003",
      password: "password123",
      role: "MANAGER",
    });
    const stored = await users.findByUsername("+584141000003");
    expect(stored!.username).toBe("+584141000003");
    expect(stored!.telefono).toBe("+584141000003");
  });

  test("rechaza un telefono ya tomado", async () => {
    await register.execute({
      telefono: "+584141000020",
      password: "password123",
      role: "MANAGER",
    });
    await expect(
      register.execute({
        telefono: "+584141000020",
        password: "otherpass123",
        role: "ADMIN",
      }),
    ).rejects.toBeInstanceOf(UsernameTakenError);
  });
});
