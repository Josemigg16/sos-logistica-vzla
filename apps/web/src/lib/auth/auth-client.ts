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
  readonly code: string;

  constructor(
    code: string,
    message: string,
  ) {
    super(message);
    this.code = code;
    this.name = "AuthError";
  }
}

/** Mensajes en español por código de error del backend. UI en español. */
const ERROR_MESSAGES: Record<string, string> = {
  INVALID_CREDENTIALS: "Número o contraseña incorrectos.",
  INVALID_REFRESH_TOKEN: "Tu sesión expiró. Inicia sesión de nuevo.",
  USER_SUSPENDED: "Tu cuenta está suspendida. Contacta a un administrador.",
  USERNAME_TAKEN: "Ese número de teléfono ya está registrado.",
  CEDULA_TAKEN: "Esa cédula ya está registrada.",
  NETWORK: "No se pudo conectar con el servidor. Revisa tu conexión.",
};

function messageFor(code: string, fallback?: string): string {
  return ERROR_MESSAGES[code] ?? fallback ?? "Ocurrió un error. Intenta de nuevo.";
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

let refreshPromise: Promise<string | null> | null = null;

/**
 * Intercambia la cookie de refresh por un access token nuevo.
 * Devuelve `null` si no hay sesión válida o si el backend no responde — el
 * caller lo trata como "no autenticado" sin romper.
 */
export async function refresh(): Promise<string | null> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      const res = await fetch(`${API_URL}/auth/refresh`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) return null;
      const data = (await res.json()) as { accessToken: string };
      return data.accessToken;
    } catch {
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
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

export interface SignupHubResult {
  user: SessionUser;
  generatedPassword: string;
  accessToken: string;
}

/**
 * Auto-registro público para coordinadores de hubs.
 * El backend genera la contraseña y devuelve tokens directamente.
 */
export async function signupHub(
  telefono: string,
  extra?: { cedula?: string; documentType?: "V" | "J"; password?: string; nombre?: string },
): Promise<SignupHubResult> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ telefono, ...extra }),
    });
  } catch {
    throw new AuthError("NETWORK", messageFor("NETWORK"));
  }
  if (!res.ok) throw await toAuthError(res);
  const data = (await res.json()) as { user: PublicUser; generatedPassword: string; accessToken: string };
  return {
    user: data.user,
    generatedPassword: data.generatedPassword,
    accessToken: data.accessToken,
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
