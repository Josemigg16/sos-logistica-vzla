import type { CreateLoteRequest, PublicLote } from "@sos/shared";
import type { LoteRepository } from "../../domain/cargo/repositories/lote.repository";
import { Lote, type LoteItemProps } from "../../domain/cargo/entities/lote";
import { HubNotFoundError } from "../../domain/cargo/errors";

export interface HubLookup {
  findHubById(id: string): Promise<{ id: string; name: string } | null>;
}

export class CreateLote {
  constructor(
    private readonly lotes: LoteRepository,
    private readonly hubLookup: HubLookup,
  ) {}

  async execute(command: CreateLoteRequest, creadoPorId?: string): Promise<PublicLote> {
    const hubOrigen = await this.hubLookup.findHubById(command.hubOrigenId);
    if (!hubOrigen) throw new HubNotFoundError(command.hubOrigenId);

    let hubDestinoNombre: string | null = null;
    if (command.hubDestinoId) {
      const hubDestino = await this.hubLookup.findHubById(command.hubDestinoId);
      if (!hubDestino) throw new HubNotFoundError(command.hubDestinoId);
      hubDestinoNombre = hubDestino.name;
    }

    const items: LoteItemProps[] = command.items.map((it) => ({
      id: crypto.randomUUID(),
      loteId: "",
      productId: it.productId,
      productName: "",
      cantidad: it.cantidad,
      pesoKg: it.pesoKg ?? null,
    }));

    const lote = Lote.create({
      id: crypto.randomUUID(),
      hubOrigenId: hubOrigen.id,
      hubOrigenNombre: hubOrigen.name,
      hubDestinoId: command.hubDestinoId ?? null,
      hubDestinoNombre,
      nota: command.nota ?? null,
      items,
      creadoPorId: creadoPorId ?? null,
    });

    await this.lotes.save(lote);
    await this.lotes.saveItems(lote.id, items.map((it) => ({
      id: it.id,
      productId: it.productId,
      cantidad: it.cantidad,
      pesoKg: it.pesoKg,
    })));

    return lote.toPublic();
  }
}
