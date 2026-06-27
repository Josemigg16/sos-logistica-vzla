/**
 * Errores del dominio de convoys. Son del negocio, no de HTTP.
 */
export class ConvoyDomainError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class ConvoyError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class InvalidConvoyTransitionError extends ConvoyDomainError {
  constructor(from: string, to: string) {
    super(
      `Transición inválida de convoy: ${from} → ${to}`,
      "INVALID_TRANSITION",
    );
  }
}

export class ConvoyNotFoundError extends ConvoyError {
  constructor(convoyId: string) {
    super(`No se encontró el convoy ${convoyId}`, "CONVOY_NOT_FOUND");
  }
}
