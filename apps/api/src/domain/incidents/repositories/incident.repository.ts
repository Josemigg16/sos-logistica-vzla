import type { Incident } from "../entities/incident";

/**
 * Puerto del repositorio de incidentes. La implementación vive en infra.
 */
export interface IncidentRepository {
  findById(id: string): Promise<Incident | null>;
  findAll(): Promise<Incident[]>;
  save(incident: Incident): Promise<void>;
}
