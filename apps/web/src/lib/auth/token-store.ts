/**
 * Access token en memoria — nunca en localStorage.
 *
 * El access token es de vida corta y se reconstruye en cada arranque a partir
 * de la cookie httpOnly del refresh token (que JS no puede leer). Mantenerlo
 * solo en memoria reduce la superficie ante XSS.
 */
let accessToken: string | null = null;

export function getToken(): string | null {
  return accessToken;
}

export function setToken(token: string): void {
  accessToken = token;
}

export function clearToken(): void {
  accessToken = null;
}
