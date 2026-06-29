import type { PublicIncident, UpdateIncidentRequest } from "@sos/shared";
import type { IncidentRepository } from "../../domain/incidents/repositories/incident.repository";
import { IncidentNotFoundError } from "../../domain/incidents/errors";

/**
 * Use case: editar una emergencia. También cierra o contiene vía `status`.
 */
export class UpdateIncident {
  constructor(private readonly incidents: IncidentRepository) {}

  async execute(
    id: string,
    command: UpdateIncidentRequest,
  ): Promise<PublicIncident> {
    const incident = await this.incidents.findById(id);
    if (!incident) throw new IncidentNotFoundError(id);
    incident.update(command);
    await this.incidents.save(incident);
    return incident.toPublic();
  }
}
