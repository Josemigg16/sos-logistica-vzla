import { describe, test, expect, beforeEach } from "bun:test";
import { CreateVehicleType } from "./create-vehicle-type";
import { ListVehicleTypes } from "./list-vehicle-types";
import { UpdateVehicleType } from "./update-vehicle-type";
import { DeleteVehicleType } from "./delete-vehicle-type";
import { CreateVehicle } from "./create-vehicle";
import { ListVehicles } from "./list-vehicles";
import { UpdateVehicle } from "./update-vehicle";
import { DeleteVehicle } from "./delete-vehicle";
import { CreateDriver } from "./create-driver";
import { ListDrivers } from "./list-drivers";
import { InMemoryVehicleTypeRepository } from "../../infrastructure/persistence/in-memory-vehicle-type.repository";
import { InMemoryVehicleRepository } from "../../infrastructure/persistence/in-memory-vehicle.repository";
import { InMemoryDriverRepository } from "../../infrastructure/persistence/in-memory-driver.repository";
import { VehicleTypeNotFoundError, VehicleNotFoundError, PlacaTakenError } from "../../domain/fleet/errors";

describe("VehicleType use cases", () => {
  let vehicleTypes: InMemoryVehicleTypeRepository;
  let create: CreateVehicleType;
  let list: ListVehicleTypes;
  let update: UpdateVehicleType;
  let remove: DeleteVehicleType;

  beforeEach(() => {
    vehicleTypes = new InMemoryVehicleTypeRepository();
    create = new CreateVehicleType(vehicleTypes);
    list = new ListVehicleTypes(vehicleTypes);
    update = new UpdateVehicleType(vehicleTypes);
    remove = new DeleteVehicleType(vehicleTypes);
  });

  test("creates a vehicle type", async () => {
    const result = await create.execute({ nombre: "Camión", descripcion: "Vehículo pesado" });
    expect(result.nombre).toBe("Camión");
    expect(result.id).toBeTruthy();
  });

  test("lists vehicle types", async () => {
    await create.execute({ nombre: "Camión", descripcion: "" });
    await create.execute({ nombre: "Camioneta", descripcion: "" });
    const all = await list.execute();
    expect(all).toHaveLength(2);
  });

  test("updates a vehicle type", async () => {
    const created = await create.execute({ nombre: "Camión", descripcion: "" });
    const updated = await update.execute(created.id, { nombre: "Camión Grande" });
    expect(updated.nombre).toBe("Camión Grande");
  });

  test("throws VehicleTypeNotFoundError on update of missing type", async () => {
    await expect(update.execute("non-existent-id", { nombre: "X" })).rejects.toBeInstanceOf(VehicleTypeNotFoundError);
  });

  test("deletes a vehicle type", async () => {
    const created = await create.execute({ nombre: "Camión", descripcion: "" });
    await remove.execute(created.id);
    const all = await list.execute();
    expect(all).toHaveLength(0);
  });

  test("throws VehicleTypeNotFoundError on delete of missing type", async () => {
    await expect(remove.execute("non-existent-id")).rejects.toBeInstanceOf(VehicleTypeNotFoundError);
  });
});

describe("Vehicle use cases", () => {
  let vehicles: InMemoryVehicleRepository;
  let create: CreateVehicle;
  let list: ListVehicles;
  let update: UpdateVehicle;
  let remove: DeleteVehicle;

  beforeEach(() => {
    vehicles = new InMemoryVehicleRepository();
    create = new CreateVehicle(vehicles);
    list = new ListVehicles(vehicles);
    update = new UpdateVehicle(vehicles);
    remove = new DeleteVehicle(vehicles);
  });

  test("creates a vehicle", async () => {
    const result = await create.execute({ placa: "ABC123", modelo: "Ford F-150", capacidadCargaKg: 1000 });
    expect(result.placa).toBe("ABC123");
    expect(result.estado).toBe("DISPONIBLE");
  });

  test("rejects duplicate placa", async () => {
    await create.execute({ placa: "ABC123", modelo: "Ford", capacidadCargaKg: 1000 });
    await expect(create.execute({ placa: "ABC123", modelo: "Toyota", capacidadCargaKg: 800 })).rejects.toBeInstanceOf(PlacaTakenError);
  });

  test("updates vehicle estado", async () => {
    const created = await create.execute({ placa: "XYZ999", modelo: "Camión", capacidadCargaKg: 5000 });
    const updated = await update.execute(created.id, { estado: "EN_RUTA" });
    expect(updated.estado).toBe("EN_RUTA");
  });

  test("throws VehicleNotFoundError on update", async () => {
    await expect(update.execute("bad-id", { estado: "EN_RUTA" })).rejects.toBeInstanceOf(VehicleNotFoundError);
  });

  test("deletes a vehicle", async () => {
    const created = await create.execute({ placa: "DEL123", modelo: "Van", capacidadCargaKg: 500 });
    await remove.execute(created.id);
    const all = await list.execute();
    expect(all).toHaveLength(0);
  });
});

describe("Driver use cases", () => {
  let drivers: InMemoryDriverRepository;
  let create: CreateDriver;
  let list: ListDrivers;

  beforeEach(() => {
    drivers = new InMemoryDriverRepository();
    create = new CreateDriver(drivers);
    list = new ListDrivers(drivers);
  });

  test("creates a driver without user account", async () => {
    const result = await create.execute({
      nombre: "Juan",
      apellido: "Pérez",
      cedula: "12345678",
      licencia: "Grado 5",
      telefono: "0412-1234567",
    });
    expect(result.nombre).toBe("Juan");
    expect(result.apellido).toBe("Pérez");
    expect(result.cedula).toBe("12345678");
    expect(result.disponible).toBe(true);
    expect(result.id).toBeTruthy();
  });

  test("lists drivers", async () => {
    await create.execute({ nombre: "A", apellido: "B", cedula: "11111111", licencia: "G3", telefono: "0412-0000001" });
    await create.execute({ nombre: "C", apellido: "D", cedula: "22222222", licencia: "G5", telefono: "0412-0000002" });
    const all = await list.execute();
    expect(all).toHaveLength(2);
  });
});
