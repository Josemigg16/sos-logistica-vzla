import { beforeEach, describe, expect, test } from "bun:test";
import { SelfRegisterCoordinator } from "./self-register-coordinator";
import { InMemoryUserRepository } from "../../infrastructure/persistence/in-memory-user.repository";
import { UsernameTakenError, CedulaTakenError } from "../../domain/identity/errors";
import { FakeHasher } from "../../../tests/support";

describe("SelfRegisterCoordinator", () => {
  let users: InMemoryUserRepository;
  let coordinator: SelfRegisterCoordinator;

  beforeEach(() => {
    users = new InMemoryUserRepository();
    coordinator = new SelfRegisterCoordinator(users, new FakeHasher());
  });

  test("crea un HUB_COORDINATOR con telefono como username", async () => {
    const { user } = await coordinator.execute({ telefono: "+584141000001" });
    expect(user.role).toBe("HUB_COORDINATOR");
    expect(user.username).toBe("+584141000001");
    const stored = await users.findByUsername("+584141000001");
    expect(stored).not.toBeNull();
    expect(stored!.telefono).toBe("+584141000001");
  });

  test("devuelve una contraseña generada de 5 caracteres", async () => {
    const { generatedPassword } = await coordinator.execute({ telefono: "+584141000002" });
    expect(generatedPassword).toBeTruthy();
    expect(generatedPassword!.length).toBe(5);
  });

  test("la contraseña generada es válida para autenticar", async () => {
    const { generatedPassword } = await coordinator.execute({ telefono: "+584141000003" });
    const stored = await users.findByUsername("+584141000003");
    const hasher = new FakeHasher();
    const valid = await hasher.verify(generatedPassword!, stored!.credential.hash);
    expect(valid).toBe(true);
  });

  test("acepta contraseña propia y devuelve generatedPassword null", async () => {
    const { generatedPassword } = await coordinator.execute({
      telefono: "+584141000004",
      password: "MICLAVE123",
    });
    expect(generatedPassword).toBeNull();
    const stored = await users.findByUsername("+584141000004");
    const hasher = new FakeHasher();
    const valid = await hasher.verify("MICLAVE123", stored!.credential.hash);
    expect(valid).toBe(true);
  });

  test("rechaza registro duplicado por telefono", async () => {
    await coordinator.execute({ telefono: "+584141000010" });
    await expect(
      coordinator.execute({ telefono: "+584141000010" }),
    ).rejects.toBeInstanceOf(UsernameTakenError);
  });

  test("rechaza cédula duplicada", async () => {
    await coordinator.execute({
      telefono: "+584141000020",
      documentType: "V",
      cedula: "12345678",
    });
    await expect(
      coordinator.execute({
        telefono: "+584141000021",
        documentType: "V",
        cedula: "12345678",
      }),
    ).rejects.toBeInstanceOf(CedulaTakenError);
  });
});
