import type { HubRepository } from "../../domain/resources/repositories/hub.repository";
import type { Hub } from "../../domain/resources/entities/hub";

/**
 * Adapter in-memory del puerto HubRepository. Para tests y para correr la API
 * sin Postgres. Misma interfaz que el adapter de Drizzle.
 */
export class InMemoryHubRepository implements HubRepository {
  private readonly byId = new Map<string, Hub>();

  async findById(id: string): Promise<Hub | null> {
    return this.byId.get(id) ?? null;
  }

  async findByCoordinator(coordinatorId: string): Promise<Hub | null> {
    for (const hub of this.byId.values()) {
      if (hub.toPublic().coordinatorId === coordinatorId) return hub;
    }
    return null;
  }

  async findAll(): Promise<Hub[]> {
    return [...this.byId.values()];
  }

  async save(hub: Hub): Promise<void> {
    this.byId.set(hub.id, hub);
  }

  async delete(id: string): Promise<void> {
    this.byId.delete(id);
  }
}
