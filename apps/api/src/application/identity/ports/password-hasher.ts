/**
 * Puerto de hashing. La implementación (argon2id vía Bun.password) vive en
 * infraestructura. El use case depende de esta abstracción, no de Bun.
 */
export interface PasswordHasher {
  hash(plain: string): Promise<string>;
  verify(plain: string, hash: string): Promise<boolean>;
}
