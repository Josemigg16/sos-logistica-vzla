import { ReportIncident } from "../application/incidents/report-incident";
import { ListIncidents } from "../application/incidents/list-incidents";
import { DrizzleIncidentRepository } from "./persistence/drizzle-incident.repository";
import { createIncidentRoutes } from "./http/incidents.routes";

/**
 * Composition root del bounded context `incidents`: cablea las
 * implementaciones concretas a los puertos.
 */
export function createIncidentsModule() {
  const incidents = new DrizzleIncidentRepository();

  const useCases = {
    reportIncident: new ReportIncident(incidents),
    listIncidents: new ListIncidents(incidents),
  };

  return {
    useCases,
    routes: createIncidentRoutes(useCases),
  };
}
