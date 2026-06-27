import { test, expect, mock, afterEach } from "bun:test";
import { AuthError, fetchMe, login, logout, refresh } from "./auth-client";

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

function stubFetch(impl: (url: string, opts?: RequestInit) => Promise<Response>) {
  const fn = mock(impl);
  globalThis.fetch = fn as unknown as typeof fetch;
  return fn;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

test("login devuelve token y usuario en éxito", async () => {
  stubFetch(async () =>
    jsonResponse({
      accessToken: "tok",
      user: { id: "u1", username: "ana", role: "ADMIN", email: null },
    }),
  );
  const result = await login({ username: "ana", password: "password123" });
  expect(result.accessToken).toBe("tok");
  expect(result.user).toEqual({ id: "u1", username: "ana", role: "ADMIN", email: null });
});

test("login manda credentials: include (para la cookie de refresh)", async () => {
  const fn = stubFetch(async () =>
    jsonResponse({ accessToken: "tok", user: { id: "u1", username: "ana", role: "ADMIN", email: null } }),
  );
  await login({ username: "ana", password: "password123" });
  const opts = fn.mock.calls[0]?.[1] as RequestInit;
  expect(opts.credentials).toBe("include");
  expect(opts.method).toBe("POST");
});

test("login mapea INVALID_CREDENTIALS a un mensaje en español", async () => {
  stubFetch(async () => jsonResponse({ error: "x", code: "INVALID_CREDENTIALS" }, 401));
  await expect(login({ username: "ana", password: "badpassword" })).rejects.toBeInstanceOf(AuthError);
  try {
    await login({ username: "ana", password: "badpassword" });
  } catch (err) {
    expect((err as AuthError).code).toBe("INVALID_CREDENTIALS");
    expect((err as AuthError).message.toLowerCase()).toContain("incorrect");
  }
});

test("login mapea USER_SUSPENDED a su mensaje", async () => {
  stubFetch(async () => jsonResponse({ error: "x", code: "USER_SUSPENDED" }, 403));
  try {
    await login({ username: "ana", password: "password123" });
    throw new Error("debió lanzar");
  } catch (err) {
    expect((err as AuthError).code).toBe("USER_SUSPENDED");
    expect((err as AuthError).message.toLowerCase()).toContain("suspend");
  }
});

test("login lanza AuthError de red si fetch revienta", async () => {
  stubFetch(async () => {
    throw new TypeError("network down");
  });
  await expect(login({ username: "ana", password: "password123" })).rejects.toBeInstanceOf(AuthError);
});

test("refresh devuelve el token nuevo en éxito", async () => {
  stubFetch(async () => jsonResponse({ accessToken: "fresh" }));
  expect(await refresh()).toBe("fresh");
});

test("refresh devuelve null si no hay sesión (401)", async () => {
  stubFetch(async () => jsonResponse({ error: "No autenticado" }, 401));
  expect(await refresh()).toBeNull();
});

test("refresh devuelve null si fetch revienta (backend caído)", async () => {
  stubFetch(async () => {
    throw new TypeError("network down");
  });
  expect(await refresh()).toBeNull();
});

test("fetchMe normaliza el actor a SessionUser", async () => {
  const fn = stubFetch(async () =>
    jsonResponse({ actor: { userId: "u1", username: "ana", role: "ADMIN" } }),
  );
  const user = await fetchMe("tok");
  expect(user).toEqual({ id: "u1", username: "ana", role: "ADMIN" });
  const opts = fn.mock.calls[0]?.[1] as RequestInit;
  expect((opts.headers as Record<string, string>).Authorization).toBe("Bearer tok");
});

test("fetchMe devuelve null si el token no sirve", async () => {
  stubFetch(async () => jsonResponse({ error: "Token inválido" }, 401));
  expect(await fetchMe("bad")).toBeNull();
});

test("logout pega al endpoint y no lanza", async () => {
  const fn = stubFetch(async () => jsonResponse({ ok: true }));
  await logout();
  expect(fn).toHaveBeenCalledTimes(1);
  const opts = fn.mock.calls[0]?.[1] as RequestInit;
  expect(opts.method).toBe("POST");
  expect(opts.credentials).toBe("include");
});

test("logout no lanza aunque el backend falle", async () => {
  stubFetch(async () => {
    throw new TypeError("network down");
  });
  await expect(logout()).resolves.toBeUndefined();
});
