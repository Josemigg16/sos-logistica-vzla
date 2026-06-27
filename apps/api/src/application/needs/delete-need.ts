import type { NeedRepository } from "../../domain/resources/repositories/need.repository";
import { NeedNotFoundError } from "../../domain/resources/errors";

/**
 * Use case: eliminar una necesidad por ID.
 * Lanza NeedNotFoundError si no existe.
 */
export class DeleteNeed {
  constructor(private readonly needs: NeedRepository) {}

  async execute(id: string): Promise<void> {
    const deleted = await this.needs.delete(id);
    if (!deleted) throw new NeedNotFoundError(id);
  }
}
