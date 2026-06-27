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

export class ProductNotFoundError extends ResourceError {
  constructor(id: string) {
    super(`Producto no encontrado`, "PRODUCT_NOT_FOUND");
  }
}

export class DuplicateProductNameError extends ResourceError {
  constructor(name: string) {
    super(`Ya existe un producto con este nombre en el catálogo`, "DUPLICATE_PRODUCT_NAME");
  }
}

export class NeedNotFoundError extends ResourceError {
  constructor(needId: string) {
    super(`No se encontró la necesidad ${needId}`, "NEED_NOT_FOUND");
  }
}
