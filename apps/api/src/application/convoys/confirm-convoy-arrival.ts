import type { PublicConvoy } from "@sos/shared";
import { ConvoyNotFoundError } from "../../domain/convoys/errors";
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
    const lotesEntregados = convoyLotes.filter((l) => l.estado === "ENTREGADO");

    convoy.confirmArrival();

    for (const lote of lotesEntregados) {
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
