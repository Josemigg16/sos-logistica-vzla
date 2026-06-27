import type { LoginRequest, PublicUser, RoleName } from "@sos/shared";
import { API_URL } from "./config";

/**
 * Cliente HTTP del bounded context `identity`. Es la ÚNICA pieza que conoce la
 * forma de los endpoints `/auth/*`. La UI nunca hace fetch directo: habla con
 * estas funciones, que devuelven datos ya normalizados o lanzan `AuthError`.
 */

export interface SessionUser {
  id: string;
  username: string;
  role: RoleName;
  email?: string | null;
}

export class AuthError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "AuthError";
  }
}

/** Mensajes en español por código de error del backend. UI en español. */
const ERROR_MESSAGES: Record<string, string> = {
  INVALID_CREDENTIALS: "Usuario o contraseña incorrectos.",
  INVALID_REFRESH_TOKEN: "Tu sesión expiró. Iniciá sesión de nuevo.",
  USER_SUSPENDED: "Tu cuenta está suspendida. Contactá a un administrador.",
  NETWORK: "No se pudo conectar con el servidor. Revisá tu conexión.",
};

function messageFor(code: string, fallback?: string): string {
  return ERROR_MESSAGES[code] ?? fallback ?? "Ocurrió un error. Intentá de nuevo.";
}

async function toAuthError(res: Response): Promise<AuthError> {
  const body = (await res.json().catch(() => null)) as
    | { code?: string; error?: string }
    | null;
  const code = body?.code ?? "UNKNOWN";
  return new AuthError(code, messageFor(code, body?.error));
}

export async function login(
  credentials: LoginRequest,
): Promise<{ accessToken: string; user: SessionUser }> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(credentials),
    });
  } catch {
    throw new AuthError("NETWORK", messageFor("NETWORK"));
  }
  if (!res.ok) throw await toAuthError(res);
  const data = (await res.json()) as { accessToken: string; user: PublicUser };
  return { accessToken: data.accessToken, user: data.user };
}

/**
 * Intercambia la cookie de refresh por un access token nuevo.
 * Devuelve `null` si no hay sesión válida o si el backend no responde — el
 * caller lo trata como "no autenticado" sin romper.
 */
export async function refresh(): Promise<string | null> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      credentials: "include",
    });
  } catch {
    return null;
  }
  if (!res.ok) return null;
  const data = (await res.json()) as { accessToken: string };
  return data.accessToken;
}

/** Resuelve el usuario actual a partir de un access token. `null` si no sirve. */
export async function fetchMe(accessToken: string): Promise<SessionUser | null> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      credentials: "include",
    });
  } catch {
    return null;
  }
  if (!res.ok) return null;
  const data = (await res.json()) as {
    actor: { userId: string; username: string; role: RoleName };
  };
  return {
    id: data.actor.userId,
    username: data.actor.username,
    role: data.actor.role,
  };
}

/** Revoca la sesión. Resiliente: limpiamos local igual aunque el backend falle. */
export async function logout(): Promise<void> {
  try {
    await fetch(`${API_URL}/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
  } catch {
    // Silencioso a propósito: el caller borra el estado local de todos modos.
  }
}
