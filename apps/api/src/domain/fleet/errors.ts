export class FleetError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class VehicleTypeNotFoundError extends FleetError {
  constructor(id: string) {
    super(`Tipo de vehículo no encontrado: ${id}`, "VEHICLE_TYPE_NOT_FOUND");
  }
}

export class VehicleNotFoundError extends FleetError {
  constructor(id: string) {
    super(`Vehículo no encontrado: ${id}`, "VEHICLE_NOT_FOUND");
  }
}

export class DriverNotFoundError extends FleetError {
  constructor(id: string) {
    super(`Chofer no encontrado: ${id}`, "DRIVER_NOT_FOUND");
  }
}

export class PlacaTakenError extends FleetError {
  constructor(placa: string) {
    super(`La placa ${placa} ya está registrada`, "PLACA_TAKEN");
  }
}
