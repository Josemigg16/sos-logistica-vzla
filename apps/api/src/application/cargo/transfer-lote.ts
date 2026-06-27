import type { TransferLoteRequest, PublicLote } from "@sos/shared";
import type { LoteRepository } from "../../domain/cargo/repositories/lote.repository";
import {
  LoteNotFoundError,
  LoteNotInTransitError,
  VehicleHasNoDriverError,
  VehicleCapacityExceededError,
} from "../../domain/cargo/errors";

export interface VehicleLookup {
  findVehicleById(id: string): Promise<{ id: string; placa: string; capacidadCargaKg: number; choferId: string | null } | null>;
}

export class TransferLote {
  constructor(
    private readonly lotes: LoteRepository,
    private readonly vehicleLookup: VehicleLookup,
  ) {}

  async execute(loteId: string, command: TransferLoteRequest, autorizadoPorId?: string): Promise<PublicLote> {
    const lote = await this.lotes.findById(loteId);
    if (!lote) throw new LoteNotFoundError(loteId);
    if (lote.estado !== "EN_TRANSITO") throw new LoteNotInTransitError(loteId);

    const destino = await this.vehicleLookup.findVehicleById(command.vehiculoDestinoId);
    if (!destino) throw new LoteNotFoundError(command.vehiculoDestinoId);
    if (!destino.choferId) throw new VehicleHasNoDriverError(command.vehiculoDestinoId);

    const pesoActual = await this.lotes.sumPesoByVehicle(command.vehiculoDestinoId);
    if (pesoActual + lote.pesoTotalKg > destino.capacidadCargaKg) {
      throw new VehicleCapacityExceededError(command.vehiculoDestinoId);
    }

    const vehiculoOrigenId = lote.vehiculoId;
    lote.transfer(destino.id, destino.placa);
    await this.lotes.save(lote);
    return lote.toPublic();
  }
}
