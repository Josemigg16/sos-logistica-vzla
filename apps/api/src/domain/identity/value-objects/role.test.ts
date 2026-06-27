import { describe, expect, test } from "bun:test";
import { Role } from "./role";

describe("Role", () => {
  test("acepta los 7 roles del catálogo unificado", () => {
    const catalog = [
      "ADMIN",
      "MANAGER",
      "ZODI_SENDER",
      "ZODI_DESTINATION",
      "HUB_COORDINATOR",
      "DRIVER",
      "VOLUNTEER",
    ] as const;
    for (const value of catalog) {
      expect(Role.create(value).value).toBe(value);
    }
  });

  test("distingue las dos variantes de ZODI", () => {
    expect(
      Role.create("ZODI_SENDER").equals(Role.create("ZODI_DESTINATION")),
    ).toBe(false);
  });

  test("rechaza un rol inválido", () => {
    expect(() => Role.create("ZODI")).toThrow();
    expect(() => Role.create("SUPERUSER")).toThrow();
  });

  test("compara por valor (es value object)", () => {
    expect(Role.create("DRIVER").equals(Role.create("DRIVER"))).toBe(true);
    expect(Role.create("DRIVER").equals(Role.create("VOLUNTEER"))).toBe(false);
  });

  test("isAdmin solo es true para ADMIN", () => {
    expect(Role.create("ADMIN").isAdmin()).toBe(true);
    expect(Role.create("MANAGER").isAdmin()).toBe(false);
  });
});
