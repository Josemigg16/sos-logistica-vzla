import type { LoteRepository } from "../../domain/cargo/repositories/lote.repository";
import { LoteNotFoundError } from "../../domain/cargo/errors";

export class DeleteLote {
  constructor(private readonly lotes: LoteRepository) {}

  async execute(id: string): Promise<void> {
    const lote = await this.lotes.findById(id);
    if (!lote) throw new LoteNotFoundError(id);
    await this.lotes.delete(id);
  }
}
