import type { LoteRepository } from "../../domain/cargo/repositories/lote.repository";
import type { Lote } from "../../domain/cargo/entities/lote";

export class InMemoryLoteRepository implements LoteRepository {
  private store = new Map<string, Lote>();

  async findById(id: string): Promise<Lote | null> {
    return this.store.get(id) ?? null;
  }

  async findAll(): Promise<Lote[]> {
    return Array.from(this.store.values());
  }

  async findByHub(hubId: string): Promise<Lote[]> {
    return Array.from(this.store.values()).filter(
      (l) => l.hubOrigenId === hubId || l.hubDestinoId === hubId,
    );
  }

  async findByVehicle(vehiculoId: string): Promise<Lote[]> {
    return Array.from(this.store.values()).filter((l) => l.vehiculoId === vehiculoId);
  }

  async save(lote: Lote): Promise<void> {
    this.store.set(lote.id, lote);
  }

  async saveItems(_loteId: string, _items: Array<{ id: string; productId: string; cantidad: number; pesoKg: number | null }>): Promise<void> {
    // In-memory: items are stored within the Lote entity itself
  }

  async delete(id: string): Promise<void> {
    this.store.delete(id);
  }

  async sumPesoByVehicle(vehiculoId: string): Promise<number> {
    return Array.from(this.store.values())
      .filter((l) => l.vehiculoId === vehiculoId && l.estado === "EN_TRANSITO")
      .reduce((acc, l) => acc + l.pesoTotalKg, 0);
  }
}
