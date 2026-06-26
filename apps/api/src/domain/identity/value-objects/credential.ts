/**
 * Value Object: la credencial de acceso. Encapsula el hash de la contraseña.
 *
 * El dominio NUNCA conoce la contraseña en texto plano ni cómo se hashea —
 * eso vive en infraestructura (PasswordHasher). Acá solo vive el hash.
 */
export class Credential {
  private constructor(public readonly hash: string) {}

  static fromHash(hash: string): Credential {
    if (!hash) throw new Error("Credential requiere un hash no vacío");
    return new Credential(hash);
  }
}
