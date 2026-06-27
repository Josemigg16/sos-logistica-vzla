import type { ConvoyStatus } from "@sos/shared";
import type { Convoy } from "../../domain/convoys/entities/convoy";
import type { ConvoyRepository } from "../../domain/convoys/repositories/convoy.repository";

export class InMemoryConvoyRepository implements ConvoyRepository {
  private readonly byId = new Map<string, Convoy>();

  async save(convoy: Convoy): Promise<void> {
    this.byId.set(convoy.id, convoy);
  }

  async findById(id: string): Promise<Convoy | null> {
    return this.byId.get(id) ?? null;
  }

  async findAll(filter: { status?: ConvoyStatus } = {}): Promise<Convoy[]> {
    const convoys = [...this.byId.values()];
    if (!filter.status) return convoys;
    return convoys.filter((convoy) => convoy.status === filter.status);
  }
}
