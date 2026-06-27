import type { UpdateLoteRequest, PublicLote } from "@sos/shared";
import type { LoteRepository } from "../../domain/cargo/repositories/lote.repository";
import { LoteNotFoundError } from "../../domain/cargo/errors";

export interface HubLookup {
  findHubById(id: string): Promise<{ id: string; name: string } | null>;
}

export class UpdateLote {
  constructor(
    private readonly lotes: LoteRepository,
    private readonly hubLookup: HubLookup,
  ) {}

  async execute(id: string, command: UpdateLoteRequest): Promise<PublicLote> {
    const lote = await this.lotes.findById(id);
    if (!lote) throw new LoteNotFoundError(id);

    let hubDestinoNombre: string | null | undefined = undefined;
    if (command.hubDestinoId !== undefined) {
      if (command.hubDestinoId) {
        const hub = await this.hubLookup.findHubById(command.hubDestinoId);
        hubDestinoNombre = hub?.name ?? null;
      } else {
        hubDestinoNombre = null;
      }
    }

    lote.updateMeta({
      hubDestinoId: command.hubDestinoId,
      hubDestinoNombre,
      nota: command.nota,
    });
    await this.lotes.save(lote);
    return lote.toPublic();
  }
}
