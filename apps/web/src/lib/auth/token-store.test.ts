import { test, expect, beforeEach } from "bun:test";
import { clearToken, getToken, setToken } from "./token-store";

beforeEach(() => clearToken());

test("arranca sin token", () => {
  expect(getToken()).toBeNull();
});

test("guarda y lee el access token", () => {
  setToken("access-123");
  expect(getToken()).toBe("access-123");
});

test("clearToken borra el token", () => {
  setToken("access-123");
  clearToken();
  expect(getToken()).toBeNull();
});
