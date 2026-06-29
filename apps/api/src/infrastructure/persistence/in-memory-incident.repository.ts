import type { IncidentRepository } from "../../domain/incidents/repositories/incident.repository";
import type { Incident } from "../../domain/incidents/entities/incident";

export class InMemoryIncidentRepository implements IncidentRepository {
  private store = new Map<string, Incident>();

  async findById(id: string): Promise<Incident | null> {
    return this.store.get(id) ?? null;
  }

  async findAll(): Promise<Incident[]> {
    return Array.from(this.store.values());
  }

  async save(incident: Incident): Promise<void> {
    this.store.set(incident.id, incident);
  }
}
