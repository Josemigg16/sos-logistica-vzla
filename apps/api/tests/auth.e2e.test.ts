import { describe, expect, test } from "bun:test";
import { buildAuthApp, extractRefreshCookie } from "./support";

const json = (body: unknown) => ({
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body),
});

async function loginAdmin(app: Awaited<ReturnType<typeof buildAuthApp>>["app"]) {
  const res = await app.request(
    "/login",
    json({ username: "admin", password: "adminpass123" }),
  );
  const cookie = extractRefreshCookie(res.headers.get("set-cookie"));
  const { accessToken, user } = (await res.json()) as {
    accessToken: string;
    user: { role: string };
  };
  return { res, accessToken, cookie, user };
}

describe("Auth e2e (HTTP)", () => {
  test("flujo completo: login -> me -> refresh -> logout", async () => {
    const { app } = await buildAuthApp();

    const { res, accessToken, cookie, user } = await loginAdmin(app);
    expect(res.status).toBe(200);
    expect(user.role).toBe("ADMIN");
    expect(accessToken).toBeTruthy();

    const me = await app.request("/me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    expect(me.status).toBe(200);
    expect(((await me.json()) as { actor: { username: string } }).actor.username).toBe(
      "admin",
    );

    const refreshed = await app.request("/refresh", {
      method: "POST",
      headers: { Cookie: cookie },
    });
    expect(refreshed.status).toBe(200);
    const newCookie = extractRefreshCookie(refreshed.headers.get("set-cookie"));

    const logout = await app.request("/logout", {
      method: "POST",
      headers: { Cookie: newCookie },
    });
    expect(logout.status).toBe(200);
  });

  test("login con credenciales malas devuelve 401", async () => {
    const { app } = await buildAuthApp();
    const res = await app.request(
      "/login",
      json({ username: "admin", password: "wrongpass1" }),
    );
    expect(res.status).toBe(401);
  });

  test("login con body inválido devuelve 400 (Zod)", async () => {
    const { app } = await buildAuthApp();
    const res = await app.request("/login", json({ username: "x", password: "1" }));
    expect(res.status).toBe(400);
  });

  test("register exige ADMIN y permite loguear al nuevo usuario", async () => {
    const { app } = await buildAuthApp();

    // sin token -> 401
    const noToken = await app.request(
      "/register",
      json({ username: "coord1", password: "coordpass1", role: "HUB_COORDINATOR" }),
    );
    expect(noToken.status).toBe(401);

    // con token de admin -> 201
    const { accessToken } = await loginAdmin(app);
    const created = await app.request("/register", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        username: "coord1",
        password: "coordpass1",
        role: "HUB_COORDINATOR",
      }),
    });
    expect(created.status).toBe(201);

    // el nuevo usuario puede autenticarse
    const login = await app.request(
      "/login",
      json({ username: "coord1", password: "coordpass1" }),
    );
    expect(login.status).toBe(200);
  });

  test("reusar el refresh cookie viejo tras rotar devuelve 401", async () => {
    const { app } = await buildAuthApp();
    const { cookie } = await loginAdmin(app);

    const first = await app.request("/refresh", {
      method: "POST",
      headers: { Cookie: cookie },
    });
    expect(first.status).toBe(200);

    const reuse = await app.request("/refresh", {
      method: "POST",
      headers: { Cookie: cookie },
    });
    expect(reuse.status).toBe(401);
  });
});
