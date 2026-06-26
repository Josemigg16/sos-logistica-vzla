import type { PasswordHasher } from "../../application/identity/ports/password-hasher";

/**
 * Implementación del puerto PasswordHasher con argon2id nativo de Bun.
 */
export class BunPasswordHasher implements PasswordHasher {
  hash(plain: string): Promise<string> {
    return Bun.password.hash(plain, { algorithm: "argon2id" });
  }

  verify(plain: string, hash: string): Promise<boolean> {
    return Bun.password.verify(plain, hash);
  }
}
