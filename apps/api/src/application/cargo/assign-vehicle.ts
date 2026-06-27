import type { AssignVehicleRequest, PublicLote } from "@sos/shared";
import type { LoteRepository } from "../../domain/cargo/repositories/lote.repository";
import {
  LoteNotFoundError,
  LoteAlreadyDeliveredError,
  VehicleHasNoDriverError,
  VehicleCapacityExceededError,
} from "../../domain/cargo/errors";

export interface VehicleLookup {
  findVehicleById(id: string): Promise<{ id: string; placa: string; capacidadCargaKg: number; choferId: string | null } | null>;
}

export class AssignVehicle {
  constructor(
    private readonly lotes: LoteRepository,
    private readonly vehicleLookup: VehicleLookup,
  ) {}

  async execute(loteId: string, command: AssignVehicleRequest): Promise<PublicLote> {
    const lote = await this.lotes.findById(loteId);
    if (!lote) throw new LoteNotFoundError(loteId);
    if (lote.estado === "ENTREGADO") throw new LoteAlreadyDeliveredError(loteId);

    const vehiculo = await this.vehicleLookup.findVehicleById(command.vehiculoId);
    if (!vehiculo) throw new LoteNotFoundError(command.vehiculoId);
    if (!vehiculo.choferId) throw new VehicleHasNoDriverError(command.vehiculoId);

    const pesoActual = await this.lotes.sumPesoByVehicle(command.vehiculoId);
    if (pesoActual + lote.pesoTotalKg > vehiculo.capacidadCargaKg) {
      throw new VehicleCapacityExceededError(command.vehiculoId);
    }

    lote.assignVehicle(vehiculo.id, vehiculo.placa);
    await this.lotes.save(lote);
    return lote.toPublic();
  }
}
