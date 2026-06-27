import type { PublicConvoy } from "@sos/shared";
import { ConvoyNotFoundError } from "../../domain/convoys/errors";
import { LoteNotDeliveredError } from "../../domain/cargo/errors";
import type { ConvoyRepository } from "../../domain/convoys/repositories/convoy.repository";
import type { LoteRepository } from "../../domain/cargo/repositories/lote.repository";

export interface ConfirmConvoyArrivalCommand {
  id: string;
  actorId: string;
}

export class ConfirmConvoyArrival {
  constructor(
    private readonly convoys: ConvoyRepository,
    private readonly lotes: LoteRepository,
  ) {}

  async execute(command: ConfirmConvoyArrivalCommand): Promise<PublicConvoy> {
    const convoy = await this.convoys.findById(command.id);
    if (!convoy) throw new ConvoyNotFoundError(command.id);

    const convoyLotes = await this.lotes.findByConvoyId(convoy.id);

    // Validar primero todos los lotes antes de mutar el estado del convoy
    for (const lote of convoyLotes) {
      if (lote.estado !== "ENTREGADO") {
        throw new LoteNotDeliveredError(lote.id);
      }
    }

    // Si todos son válidos, procedemos con las transiciones
    convoy.confirmArrival();

    for (const lote of convoyLotes) {
      lote.confirmReceipt(command.actorId);
    }

    // Persistir cambios
    await this.convoys.save(convoy);
    for (const lote of convoyLotes) {
      await this.lotes.save(lote);
    }

    return convoy.toPublic();
  }
}
