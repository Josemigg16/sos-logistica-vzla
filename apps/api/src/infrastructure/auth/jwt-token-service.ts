import { sign } from "hono/jwt";
import type {
  GeneratedRefreshToken,
  TokenService,
} from "../../application/identity/ports/token-service";
import type { User } from "../../domain/identity/entities/user";
import { config } from "../../config";

/**
 * Access token = JWT firmado (stateless, se verifica sin tocar la DB).
 * Refresh token = aleatorio de alta entropía; guardamos solo su SHA-256.
 */
export class JwtTokenService implements TokenService {
  async issueAccessToken(user: User): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    return sign(
      {
        sub: user.id,
        username: user.username,
        role: user.role.value,
        iat: now,
        exp: now + config.accessTokenTtlSeconds,
      },
      config.jwtSecret,
      "HS256",
    );
  }

  newRefreshToken(): GeneratedRefreshToken {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    const token = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join(
      "",
    );
    return { token, hash: this.hashRefreshToken(token) };
  }

  hashRefreshToken(token: string): string {
    return new Bun.CryptoHasher("sha256").update(token).digest("hex");
  }
}
