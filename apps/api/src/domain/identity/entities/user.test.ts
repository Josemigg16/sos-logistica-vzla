import { describe, expect, test } from "bun:test";
import { User } from "./user";
import { Credential } from "../value-objects/credential";
import { Role } from "../value-objects/role";
import { UserSuspendedError } from "../errors";

function buildUser() {
  return User.register({
    id: "u-1",
    username: "coord",
    credential: Credential.fromHash("hash"),
    role: Role.create("HUB_COORDINATOR"),
    email: "coord@example.com",
  });
}

describe("User", () => {
  test("se registra ACTIVE por defecto", () => {
    const user = buildUser();
    expect(user.isActive).toBe(true);
    expect(user.status).toBe("ACTIVE");
  });

  test("toPublic no expone la credencial", () => {
    const pub = buildUser().toPublic();
    expect(pub).toEqual({
      id: "u-1",
      username: "coord",
      role: "HUB_COORDINATOR",
      email: "coord@example.com",
      telefono: null,
      nombre: null,
    });
    expect(pub).not.toHaveProperty("credential");
  });

  test("un usuario activo puede autenticarse", () => {
    expect(() => buildUser().ensureCanAuthenticate()).not.toThrow();
  });

  test("un usuario suspendido NO puede autenticarse", () => {
    const user = buildUser();
    user.suspend();
    expect(user.isActive).toBe(false);
    expect(() => user.ensureCanAuthenticate()).toThrow(UserSuspendedError);
  });
});
