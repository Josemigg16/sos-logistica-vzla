import type { PublicLote } from "@sos/shared";
import type { LoteRepository } from "../../domain/cargo/repositories/lote.repository";
import { LoteNotFoundError } from "../../domain/cargo/errors";

/** Acto 1 — el ZODI_SENDER declara que el lote fue entregado en destino. */
export class MarkLoteDelivered {
  constructor(private readonly lotes: LoteRepository) {}

  async execute(loteId: string): Promise<PublicLote> {
    const lote = await this.lotes.findById(loteId);
    if (!lote) throw new LoteNotFoundError(loteId);

    lote.markDelivered();
    await this.lotes.save(lote);
    return lote.toPublic();
  }
}
