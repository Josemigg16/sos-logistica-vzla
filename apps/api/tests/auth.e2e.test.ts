import { describe, expect, test } from "bun:test";
import { buildAuthApp, extractRefreshCookie } from "./support";

const json = (body: unknown) => ({
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body),
});

const ADMIN_PHONE = "+58000000000";
const ADMIN_PASS = "adminpass123";

async function loginAdmin(app: Awaited<ReturnType<typeof buildAuthApp>>["app"]) {
  const res = await app.request(
    "/login",
    json({ telefono: ADMIN_PHONE, password: ADMIN_PASS }),
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
      ADMIN_PHONE,
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
      json({ telefono: ADMIN_PHONE, password: "wrongpass1" }),
    );
    expect(res.status).toBe(401);
  });

  test("login con body inválido devuelve 400 (Zod)", async () => {
    const { app } = await buildAuthApp();
    const res = await app.request("/login", json({ telefono: "x", password: "1" }));
    expect(res.status).toBe(400);
  });

  test("register (admin) permite crear usuario y luego loguearse", async () => {
    const { app } = await buildAuthApp();

    const created = await app.request(
      "/register",
      json({ telefono: "+58000000030", password: "coordpass1", role: "HUB_COORDINATOR" }),
    );
    expect(created.status).toBe(201);

    const login = await app.request(
      "/login",
      json({ telefono: "+58000000030", password: "coordpass1" }),
    );
    expect(login.status).toBe(200);
  });

  test("signup público crea cuenta con clave generada y devuelve accessToken", async () => {
    const { app } = await buildAuthApp();

    const res = await app.request(
      "/signup",
      json({ telefono: "+58414000001" }),
    );
    expect(res.status).toBe(201);
    const body = (await res.json()) as {
      user: { role: string };
      generatedPassword: string;
      accessToken: string;
    };
    expect(body.user.role).toBe("HUB_COORDINATOR");
    expect(body.generatedPassword).toBeTruthy();
    expect(body.accessToken).toBeTruthy();

    // La clave generada es válida para login
    const login = await app.request(
      "/login",
      json({ telefono: "+58414000001", password: body.generatedPassword }),
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

  test("la cookie de refresh usa Path=/", async () => {
    const { app } = await buildAuthApp();
    const { res } = await loginAdmin(app);
    expect(res.headers.get("set-cookie")).toContain("Path=/");
  });
});
