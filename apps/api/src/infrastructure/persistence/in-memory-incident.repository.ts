import type { IncidentRepository } from "../../domain/incidents/repositories/incident.repository";
import type { Incident } from "../../domain/incidents/entities/incident";

/**
 * Adapter in-memory del puerto IncidentRepository. Para tests y para correr
 * la API sin Postgres. Misma interfaz que el adapter de Drizzle.
 */
export class InMemoryIncidentRepository implements IncidentRepository {
  private readonly byId = new Map<string, Incident>();

  async findById(id: string): Promise<Incident | null> {
    return this.byId.get(id) ?? null;
  }

  async findAll(): Promise<Incident[]> {
    return [...this.byId.values()];
  }

  async save(incident: Incident): Promise<void> {
    this.byId.set(incident.id, incident);
  }
}
