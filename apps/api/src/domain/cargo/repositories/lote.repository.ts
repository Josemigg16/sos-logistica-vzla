import type { Lote } from "../entities/lote";

export interface LoteRepository {
  findById(id: string): Promise<Lote | null>;
  findAll(): Promise<Lote[]>;
  findByHub(hubId: string): Promise<Lote[]>;
  findByVehicle(vehiculoId: string): Promise<Lote[]>;
  findByConvoyId(convoyId: string): Promise<Lote[]>;
  save(lote: Lote): Promise<void>;
  saveItems(loteId: string, items: Array<{ id: string; productId: string; cantidad: number; pesoKg: number | null }>): Promise<void>;
  delete(id: string): Promise<void>;
  sumPesoByVehicle(vehiculoId: string): Promise<number>;
}
