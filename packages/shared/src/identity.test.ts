import { describe, expect, test } from "bun:test";
import { loginSchema } from "./identity";

describe("telefonoSchema formatting and validation", () => {
  test("accepts already formatted Venezuelan numbers", () => {
    const result = loginSchema.safeParse({ telefono: "+584145154966", password: "password" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.telefono).toBe("+584145154966");
    }
  });

  test("removes spaces and symbols", () => {
    const result = loginSchema.safeParse({ telefono: "+58 414 5154966", password: "password" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.telefono).toBe("+584145154966");
    }
  });

  test("formats 04XX local numbers to +58", () => {
    const result = loginSchema.safeParse({ telefono: "04145154966", password: "password" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.telefono).toBe("+584145154966");
    }
  });

  test("formats 4XX local numbers to +58", () => {
    const result = loginSchema.safeParse({ telefono: "4145154966", password: "password" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.telefono).toBe("+584145154966");
    }
  });

  test("prepends + to 58 country-code numbers lacking it", () => {
    const result = loginSchema.safeParse({ telefono: "584145154966", password: "password" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.telefono).toBe("+584145154966");
    }
  });

  test("removes common symbols (dashes, parentheses, dots, underscores)", () => {
    const result = loginSchema.safeParse({
      telefono: "0414-515.49_66",
      password: "password",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.telefono).toBe("+584145154966");
    }
  });

  test("rejects invalid phone numbers", () => {
    const result = loginSchema.safeParse({ telefono: "123", password: "password" });
    expect(result.success).toBe(false);
  });
});
