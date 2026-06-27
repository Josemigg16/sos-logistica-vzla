import type { Incident } from "../entities/incident";

/**
 * Puerto (contrato). La implementación con Drizzle vive en infraestructura.
 * La dependencia apunta hacia adentro: infra conoce al dominio, no al revés.
 */
export interface IncidentRepository {
  findById(id: string): Promise<Incident | null>;
  findAll(): Promise<Incident[]>;
  save(incident: Incident): Promise<void>;
}
