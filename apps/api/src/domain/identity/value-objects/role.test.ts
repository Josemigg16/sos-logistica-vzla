import { describe, expect, test } from "bun:test";
import { Role } from "./role";

describe("Role", () => {
  test("crea un rol válido", () => {
    expect(Role.create("ADMIN").value).toBe("ADMIN");
    expect(Role.create("HUB_COORDINATOR").value).toBe("HUB_COORDINATOR");
  });

  test("rechaza un rol inválido", () => {
    expect(() => Role.create("SUPERUSER")).toThrow();
  });

  test("compara por valor (es value object)", () => {
    expect(Role.create("ZODI").equals(Role.create("ZODI"))).toBe(true);
    expect(Role.create("ZODI").equals(Role.create("MANAGER"))).toBe(false);
  });

  test("isAdmin solo es true para ADMIN", () => {
    expect(Role.create("ADMIN").isAdmin()).toBe(true);
    expect(Role.create("MANAGER").isAdmin()).toBe(false);
  });
});
