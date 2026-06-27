import type { PublicConvoy } from "@sos/shared";
import { ConvoyNotFoundError } from "../../domain/convoys/errors";
import type { ConvoyRepository } from "../../domain/convoys/repositories/convoy.repository";
import type { LoteRepository } from "../../domain/cargo/repositories/lote.repository";

export interface CompleteConvoyCommand {
  id: string;
}

export class CompleteConvoy {
  constructor(
    private readonly convoys: ConvoyRepository,
    private readonly lotes: LoteRepository,
  ) {}

  async execute(command: CompleteConvoyCommand): Promise<PublicConvoy> {
    const convoy = await this.convoys.findById(command.id);
    if (!convoy) throw new ConvoyNotFoundError(command.id);

    convoy.deliver();

    // Buscar y marcar todos los lotes de la caravana como entregados
    const convoyLotes = await this.lotes.findByConvoyId(convoy.id);
    for (const lote of convoyLotes) {
      if (lote.estado === "EN_TRANSITO") {
        lote.markDelivered();
        await this.lotes.save(lote);
      }
    }

    await this.convoys.save(convoy);
    return convoy.toPublic();
  }
}
