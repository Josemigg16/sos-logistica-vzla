import type { PublicLote } from "@sos/shared";
import type { LoteRepository } from "../../domain/cargo/repositories/lote.repository";

export class ListLotes {
  constructor(private readonly lotes: LoteRepository) {}

  async execute(hubId?: string): Promise<PublicLote[]> {
    const all = hubId
      ? await this.lotes.findByHub(hubId)
      : await this.lotes.findAll();
    return all.map((l) => l.toPublic());
  }
}
