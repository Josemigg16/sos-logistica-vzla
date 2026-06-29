import { CreateIncident } from "../application/incidents/create-incident";
import { ListIncidents } from "../application/incidents/list-incidents";
import { UpdateIncident } from "../application/incidents/update-incident";
import { DrizzleIncidentRepository } from "./persistence/drizzle-incident.repository";
import { createIncidentsRoutes } from "./http/incidents.routes";

/**
 * Composition root del bounded context `incidents`.
 */
export function createIncidentsModule() {
  const incidents = new DrizzleIncidentRepository();

  const useCases = {
    createIncident: new CreateIncident(incidents),
    listIncidents: new ListIncidents(incidents),
    updateIncident: new UpdateIncident(incidents),
  };

  return {
    useCases,
    routes: createIncidentsRoutes(useCases),
  };
}
