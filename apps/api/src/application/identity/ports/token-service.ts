import type { User } from "../../../domain/identity/entities/user";

export interface GeneratedRefreshToken {
  /** Token plano — va al cliente en la cookie httpOnly. */
  token: string;
  /** Hash SHA-256 — lo único que se guarda en la base. */
  hash: string;
}

/**
 * Puerto de tokens. Implementación con hono/jwt + crypto en infraestructura.
 */
export interface TokenService {
  issueAccessToken(user: User): Promise<string>;
  newRefreshToken(): GeneratedRefreshToken;
  hashRefreshToken(token: string): string;
}
