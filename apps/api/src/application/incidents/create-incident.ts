import type { CreateIncidentRequest, PublicIncident } from "@sos/shared";
import type { IncidentRepository } from "../../domain/incidents/repositories/incident.repository";
import { Incident } from "../../domain/incidents/entities/incident";

/**
 * Use case: registrar una emergencia. Arranca con status ACTIVE.
 */
export class CreateIncident {
  constructor(private readonly incidents: IncidentRepository) {}

  async execute(
    command: CreateIncidentRequest,
    reportedById: string | null,
  ): Promise<PublicIncident> {
    const incident = Incident.create({
      id: crypto.randomUUID(),
      ...command,
      reportedById,
    });
    await this.incidents.save(incident);
    return incident.toPublic();
  }
}
