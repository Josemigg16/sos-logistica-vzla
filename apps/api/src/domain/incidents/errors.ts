/**
 * Errores del dominio de incidentes. Son del negocio, no de HTTP.
 */
export class IncidentsError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class IncidentNotFoundError extends IncidentsError {
  constructor(id: string) {
    super(`No se encontró la emergencia ${id}`, "INCIDENT_NOT_FOUND");
  }
}
