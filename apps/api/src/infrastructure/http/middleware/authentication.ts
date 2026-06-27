import type { MiddlewareHandler } from "hono";
import { verify } from "hono/jwt";
import type { RoleName } from "@sos/shared";
import { config } from "../../../config";

export interface Actor {
  userId: string;
  username: string;
  role: RoleName;
}

export interface AuthEnv {
  Variables: { actor: Actor };
}

/**
 * Verifica el access token (JWT). No toca la base. Inyecta el actor.
 */
export const authentication: MiddlewareHandler<AuthEnv> = async (c, next) => {
  const header = c.req.header("Authorization");
  if (!header?.startsWith("Bearer ")) {
    return c.json({ error: "No autenticado" }, 401);
  }

  try {
    const payload = await verify(header.slice(7), config.jwtSecret, "HS256");
    c.set("actor", {
      userId: String(payload.sub),
      username: String(payload.username),
      role: payload.role as RoleName,
    });
    await next();
  } catch {
    return c.json({ error: "Token inválido o expirado" }, 401);
  }
};

/**
 * Gate de autorización por rol. Va DESPUÉS de `authentication`.
 */
export function requireRole(...roles: RoleName[]): MiddlewareHandler<AuthEnv> {
  return async (c, next) => {
    const actor = c.get("actor");
    if (!actor || !roles.includes(actor.role)) {
      return c.json({ error: "No autorizado" }, 403);
    }
    await next();
  };
}

/**
 * Intenta verificar el JWT si está presente, pero no falla si no hay token.
 * Úsalo en rutas que son públicas pero que sirven contenido distinto a admins.
 */
export const optionalAuthentication: MiddlewareHandler<AuthEnv> = async (c, next) => {
  const header = c.req.header("Authorization");
  if (header?.startsWith("Bearer ")) {
    try {
      const payload = await verify(header.slice(7), config.jwtSecret, "HS256");
      c.set("actor", {
        userId: String(payload.sub),
        username: String(payload.username),
        role: payload.role as RoleName,
      });
    } catch {
      // Token inválido — se trata como no autenticado
    }
  }
  await next();
};

export const isAdmin = requireRole("ADMIN");
export const isManager = requireRole("MANAGER");
export const isZodiSender = requireRole("ZODI_SENDER");
export const isZodiDestination = requireRole("ZODI_DESTINATION");
export const isHubCoordinator = requireRole("HUB_COORDINATOR");
export const isDriver = requireRole("DRIVER");
export const isVolunteer = requireRole("VOLUNTEER");

