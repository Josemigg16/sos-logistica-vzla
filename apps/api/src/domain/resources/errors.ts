/**
 * Errores del dominio de recursos. Son del negocio, no de HTTP.
 */
export class ResourceError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class HubNotFoundError extends ResourceError {
  constructor(hubId: string) {
    super(`No se encontró el centro de acopio ${hubId}`, "HUB_NOT_FOUND");
  }
}

export class InsufficientStockError extends ResourceError {
  constructor(resourceId: string) {
    super(`Stock insuficiente para el recurso ${resourceId}`, "INSUFFICIENT_STOCK");
  }
}

export class InvalidStockAmountError extends ResourceError {
  constructor() {
    super("La cantidad de stock no puede ser negativa", "INVALID_STOCK_AMOUNT");
  }
}
