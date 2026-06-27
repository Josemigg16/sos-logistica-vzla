export class CargoError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class LoteNotFoundError extends CargoError {
  constructor(id: string) {
    super(`Lote "${id}" no encontrado`, "LOTE_NOT_FOUND");
  }
}

export class VehicleHasNoDriverError extends CargoError {
  constructor(vehiculoId: string) {
    super(`El vehículo "${vehiculoId}" no tiene chofer asignado`, "VEHICLE_HAS_NO_DRIVER");
  }
}

export class VehicleCapacityExceededError extends CargoError {
  constructor(vehiculoId: string) {
    super(`El vehículo "${vehiculoId}" no tiene capacidad suficiente`, "VEHICLE_CAPACITY_EXCEEDED");
  }
}

export class LoteNotInTransitError extends CargoError {
  constructor(id: string) {
    super(`El lote "${id}" no está en tránsito`, "LOTE_NOT_IN_TRANSIT");
  }
}

export class LoteAlreadyDeliveredError extends CargoError {
  constructor(id: string) {
    super(`El lote "${id}" ya fue entregado`, "LOTE_ALREADY_DELIVERED");
  }
}

export class LoteNotDeliveredError extends CargoError {
  constructor(id: string) {
    super(`El lote "${id}" todavía no fue entregado`, "LOTE_NOT_DELIVERED");
  }
}

export class LoteAlreadyReceivedError extends CargoError {
  constructor(id: string) {
    super(`El lote "${id}" ya tiene recepción confirmada`, "LOTE_ALREADY_RECEIVED");
  }
}

export class HubNotFoundError extends CargoError {
  constructor(id: string) {
    super(`Centro de acopio "${id}" no encontrado`, "HUB_NOT_FOUND");
  }
}
