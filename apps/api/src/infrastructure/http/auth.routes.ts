import { Hono } from "hono";
import type { Context } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { sign } from "hono/jwt";
import { loginSchema, registerSchema } from "@sos/shared";
import type { AuthenticateUser } from "../../application/identity/authenticate-user";
import type { RegisterUser } from "../../application/identity/register-user";
import type { RefreshSession } from "../../application/identity/refresh-session";
import type { RevokeSession } from "../../application/identity/revoke-session";
import { IdentityError } from "../../domain/identity/errors";
import { config } from "../../config";
import { authentication, requireRole, type AuthEnv } from "./middleware/authentication";

export interface AuthRoutesDeps {
  authenticateUser: AuthenticateUser;
  registerUser: RegisterUser;
  refreshSession: RefreshSession;
  revokeSession: RevokeSession;
}

const REFRESH_COOKIE = "refresh_token";
const REFRESH_PATH = "/auth";

function setRefreshCookie(c: Context, token: string, expiresAt: Date): void {
  setCookie(c, REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: config.isProd,
    sameSite: "Lax",
    path: REFRESH_PATH,
    expires: expiresAt,
  });
}

const ERROR_STATUS: Record<string, 401 | 403 | 409> = {
  INVALID_CREDENTIALS: 401,
  USER_SUSPENDED: 403,
  INVALID_REFRESH_TOKEN: 401,
  USERNAME_TAKEN: 409,
};

function mapError(c: Context, error: unknown) {
  if (error instanceof IdentityError) {
    return c.json({ error: error.message, code: error.code }, ERROR_STATUS[error.code] ?? 400);
  }
  console.error("Error inesperado en auth:", error);
  return c.json({ error: "Error interno" }, 500);
}

export function createAuthRoutes(deps: AuthRoutesDeps): Hono<AuthEnv> {
  const router = new Hono<AuthEnv>();

  router.post("/login", async (c) => {
    const parsed = loginSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) {
      return c.json({ error: "Datos inválidos", details: parsed.error.flatten() }, 400);
    }
    try {
      const result = await deps.authenticateUser.execute(parsed.data);
      setRefreshCookie(c, result.refreshToken, result.refreshExpiresAt);
      return c.json({ accessToken: result.accessToken, user: result.user });
    } catch (error) {
      return mapError(c, error);
    }
  });

  router.post("/refresh", async (c) => {
    const token = getCookie(c, REFRESH_COOKIE);
    if (!token) return c.json({ error: "No autenticado" }, 401);
    try {
      const result = await deps.refreshSession.execute(token);
      setRefreshCookie(c, result.refreshToken, result.refreshExpiresAt);
      return c.json({ accessToken: result.accessToken });
    } catch (error) {
      deleteCookie(c, REFRESH_COOKIE, { path: REFRESH_PATH });
      return mapError(c, error);
    }
  });

  router.post("/logout", async (c) => {
    await deps.revokeSession.execute(getCookie(c, REFRESH_COOKIE));
    deleteCookie(c, REFRESH_COOKIE, { path: REFRESH_PATH });
    return c.json({ ok: true });
  });

  // Alta de usuarios público (signup) para facilitar el registro de choferes, voluntarios, etc.
  router.post("/register", async (c) => {
    const parsed = registerSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) {
      return c.json({ error: "Datos inválidos", details: parsed.error.flatten() }, 400);
    }
    try {
      const user = await deps.registerUser.execute(parsed.data);
      return c.json({ user }, 201);
    } catch (error) {
      return mapError(c, error);
    }
  });

  // ¿Quién soy? — requiere access token válido.
  router.get("/me", authentication, (c) => c.json({ actor: c.get("actor") }));

  // Solicitud de token mediante secreto de API (M2M / Clientes externos)
  router.post("/token", async (c) => {
    const body = await c.req.json().catch(() => null);
    if (!body || typeof body.secret !== "string") {
      return c.json({ error: "Secreto requerido" }, 400);
    }
    if (body.secret !== config.apiSecret) {
      return c.json({ error: "Secreto inválido" }, 401);
    }

    const now = Math.floor(Date.now() / 1000);
    const accessToken = await sign(
      {
        sub: "00000000-0000-0000-0000-000000000000",
        username: "api-client",
        role: "ADMIN",
        iat: now,
        exp: now + 3600 * 24, // El token dura 24 horas para integraciones
      },
      config.jwtSecret,
      "HS256",
    );

    return c.json({ accessToken });
  });

  return router;
}
