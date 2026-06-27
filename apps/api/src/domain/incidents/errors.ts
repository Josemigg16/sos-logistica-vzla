/**
 * Errores del dominio de incidentes. Son del negocio, no de HTTP —
 * la capa http los traduce a status codes.
 */
export class IncidentError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class IncidentAlreadyClosedError extends IncidentError {
  constructor(incidentId: string) {
    super(`El incidente ${incidentId} ya está cerrado`, "INCIDENT_ALREADY_CLOSED");
  }
}

export class IncidentNotFoundError extends IncidentError {
  constructor(incidentId: string) {
    super(`No se encontró el incidente ${incidentId}`, "INCIDENT_NOT_FOUND");
  }
}
