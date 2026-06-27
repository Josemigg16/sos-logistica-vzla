import type { PublicLote } from "@sos/shared";
import type { LoteRepository } from "../../domain/cargo/repositories/lote.repository";
import { LoteNotFoundError } from "../../domain/cargo/errors";

/** Acto 2 — el ZODI_DESTINATION confirma que recibió el lote. */
export class ConfirmLoteReceipt {
  constructor(private readonly lotes: LoteRepository) {}

  async execute(loteId: string, confirmadoPorId: string): Promise<PublicLote> {
    const lote = await this.lotes.findById(loteId);
    if (!lote) throw new LoteNotFoundError(loteId);

    lote.confirmReceipt(confirmadoPorId);
    await this.lotes.save(lote);
    return lote.toPublic();
  }
}
