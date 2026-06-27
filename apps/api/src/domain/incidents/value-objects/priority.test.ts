import { describe, expect, test } from "bun:test";
import { Priority } from "./priority";

describe("Priority", () => {
  test("se crea desde un valor válido del catálogo", () => {
    expect(Priority.create("CRITICAL").value).toBe("CRITICAL");
  });

  test("rechaza un valor fuera del catálogo", () => {
    expect(() => Priority.create("CRITICA")).toThrow();
  });

  test("isCritical distingue la urgencia máxima", () => {
    expect(Priority.create("CRITICAL").isCritical).toBe(true);
    expect(Priority.create("LOW").isCritical).toBe(false);
  });

  test("dos prioridades con el mismo valor son iguales", () => {
    expect(Priority.create("HIGH").equals(Priority.create("HIGH"))).toBe(true);
    expect(Priority.create("HIGH").equals(Priority.create("LOW"))).toBe(false);
  });
});
