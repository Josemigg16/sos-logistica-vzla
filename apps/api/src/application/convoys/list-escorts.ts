import type { PublicEscort } from "@sos/shared";
import type { UserRepository } from "../../domain/identity/repositories/user.repository";

/**
 * Lista los escoltas disponibles para planificar una caravana: usuarios con
 * rol `ZODI_SENDER`. Vive en el contexto `convoys` porque "escolta" es lenguaje
 * ubicuo de caravanas; consume el puerto `UserRepository` de identity sin
 * conocer su implementación.
 */
export class ListEscorts {
  constructor(private readonly users: UserRepository) {}

  async execute(): Promise<PublicEscort[]> {
    const users = await this.users.findAll();
    return users
      .filter((user) => user.role.value === "ZODI_SENDER")
      .map((user) => ({ id: user.id, username: user.username }));
  }
}
