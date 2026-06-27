import type { CreateIncidentRequest, PublicIncident } from "@sos/shared";
import type { IncidentRepository } from "../../domain/incidents/repositories/incident.repository";
import { Incident } from "../../domain/incidents/entities/incident";
import { Priority } from "../../domain/incidents/value-objects/priority";

/**
 * Use case: registrar un incidente de desastre. `reportedById` viene del actor
 * autenticado cuando lo hay; es null para reportes anónimos.
 */
export class ReportIncident {
  constructor(private readonly incidents: IncidentRepository) {}

  async execute(
    command: CreateIncidentRequest & { reportedById?: string | null },
  ): Promise<PublicIncident> {
    const incident = Incident.report({
      id: crypto.randomUUID(),
      title: command.title,
      description: command.description,
      type: command.type,
      priority: Priority.create(command.priority),
      zone: command.zone,
      latitude: command.latitude,
      longitude: command.longitude,
      reportedById: command.reportedById ?? null,
    });
    await this.incidents.save(incident);
    return incident.toPublic();
  }
}
