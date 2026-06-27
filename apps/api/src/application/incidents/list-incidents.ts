import type { PublicIncident } from "@sos/shared";
import type { IncidentRepository } from "../../domain/incidents/repositories/incident.repository";

/**
 * Use case: listar incidentes. Lectura simple para el panel de coordinación.
 */
export class ListIncidents {
  constructor(private readonly incidents: IncidentRepository) {}

  async execute(): Promise<PublicIncident[]> {
    const incidents = await this.incidents.findAll();
    return incidents.map((incident) => incident.toPublic());
  }
}
