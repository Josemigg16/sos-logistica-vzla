/**
 * Errores del dominio de operaciones. Son del negocio, no de HTTP.
 */
export class OperationError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class OperationNotFoundError extends OperationError {
  constructor(operationId: string) {
    super(`No se encontró la operación ${operationId}`, "OPERATION_NOT_FOUND");
  }
}

export class InvalidOperationTransitionError extends OperationError {
  constructor(from: string, to: string) {
    super(
      `Transición inválida de operación: ${from} → ${to}`,
      "INVALID_OPERATION_TRANSITION",
    );
  }
}

export class InvalidAssignmentQuantityError extends OperationError {
  constructor() {
    super("La cantidad asignada debe ser positiva", "INVALID_ASSIGNMENT_QUANTITY");
  }
}
