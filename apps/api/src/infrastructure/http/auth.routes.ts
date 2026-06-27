import { Hono } from "hono";
import type { Context } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { sign } from "hono/jwt";
import { loginSchema, registerSchema, signupSchema, updateUserSchema, type AdminUserView } from "@sos/shared";
import type { AuthenticateUser } from "../../application/identity/authenticate-user";
import type { RegisterUser } from "../../application/identity/register-user";
import type { SelfRegisterCoordinator } from "../../application/identity/self-register-coordinator";
import type { RefreshSession } from "../../application/identity/refresh-session";
import type { RevokeSession } from "../../application/identity/revoke-session";
import type { UserRepository } from "../../domain/identity/repositories/user.repository";
import type { PasswordHasher } from "../../application/identity/ports/password-hasher";
import type { User } from "../../domain/identity/entities/user";
import { Credential } from "../../domain/identity/value-objects/credential";
import { Role } from "../../domain/identity/value-objects/role";
import { IdentityError } from "../../domain/identity/errors";
import { config } from "../../config";
import { authentication, requireRole, type AuthEnv } from "./middleware/authentication";

export interface AuthRoutesDeps {
  authenticateUser: AuthenticateUser;
  registerUser: RegisterUser;
  selfRegisterCoordinator: SelfRegisterCoordinator;
  refreshSession: RefreshSession;
  revokeSession: RevokeSession;
  userRepo: UserRepository;
  hasher: PasswordHasher;
}

function toAdminView(user: User): AdminUserView {
  return {
    id: user.id,
    username: user.username,
    role: user.role.value,
    status: user.status,
    email: user.email,
    createdAt: user.createdAt.toISOString(),
  };
}

const REFRESH_COOKIE = "refresh_token";

function getRefreshCookiePath(c: Context): string {
  return "/";
}

function setRefreshCookie(c: Context, token: string, expiresAt: Date): void {
  const host = c.req.header("host") ?? "";
  const isLocal = host.includes("localhost") || host.includes("127.0.0.1");

  setCookie(c, REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: config.isProd && !isLocal,
    sameSite: "Lax",
    path: getRefreshCookiePath(c),
    expires: expiresAt,
  });
}

function deleteRefreshCookie(c: Context): void {
  deleteCookie(c, REFRESH_COOKIE, {
    path: getRefreshCookiePath(c),
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
      deleteRefreshCookie(c);
      return mapError(c, error);
    }
  });

  router.post("/logout", async (c) => {
    await deps.revokeSession.execute(getCookie(c, REFRESH_COOKIE));
    deleteRefreshCookie(c);
    return c.json({ ok: true });
  });

  // Auto-registro público para coordinadores de centros de acopio
  router.post("/signup", async (c) => {
    const parsed = signupSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) {
      return c.json({ error: "Datos inválidos", details: parsed.error.flatten() }, 400);
    }
    try {
      const user = await deps.selfRegisterCoordinator.execute(parsed.data);
      return c.json({ user }, 201);
    } catch (error) {
      return mapError(c, error);
    }
  });

  // Alta de usuarios (solo ADMIN — permite especificar cualquier rol)
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

  // ─── Gestión de usuarios (solo ADMIN) ───

  // Listar todos los usuarios — vista admin con role, status, email, fecha.
  router.get("/users", authentication, requireRole("ADMIN"), async (c) => {
    try {
      const users = await deps.userRepo.findAll();
      return c.json({ users: users.map(toAdminView) });
    } catch (error) {
      console.error("Error al listar usuarios:", error);
      return c.json({ error: "Error interno" }, 500);
    }
  });

  // Actualizar role / status / email / password de un usuario.
  router.put("/users/:id", authentication, requireRole("ADMIN"), async (c) => {
    const id = c.req.param("id");
    const parsed = updateUserSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) {
      return c.json({ error: "Datos inválidos", details: parsed.error.flatten() }, 400);
    }
    try {
      const user = await deps.userRepo.findById(id);
      if (!user) return c.json({ error: "Usuario no encontrado" }, 404);

      const patch = parsed.data;
      if (patch.role !== undefined) user.changeRole(Role.create(patch.role));
      if (patch.status !== undefined) {
        if (patch.status === "ACTIVE") user.activate();
        else user.suspend();
      }
      if (patch.email !== undefined) user.changeEmail(patch.email);
      if (patch.password !== undefined) {
        const hash = await deps.hasher.hash(patch.password);
        user.changeCredential(Credential.fromHash(hash));
      }

      await deps.userRepo.save(user);
      return c.json({ user: toAdminView(user) });
    } catch (error) {
      return mapError(c, error);
    }
  });

  // Eliminar usuario. El actor no puede eliminarse a sí mismo.
  router.delete("/users/:id", authentication, requireRole("ADMIN"), async (c) => {
    const id = c.req.param("id");
    const actor = c.get("actor");
    if (actor.userId === id) {
      return c.json({ error: "No puedes eliminar tu propia cuenta" }, 400);
    }
    try {
      const deleted = await deps.userRepo.delete(id);
      if (!deleted) return c.json({ error: "Usuario no encontrado" }, 404);
      return c.json({ ok: true });
    } catch (error) {
      console.error("Error al eliminar usuario:", error);
      return c.json({ error: "Error interno" }, 500);
    }
  });

  return router;
}
