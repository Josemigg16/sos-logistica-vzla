import { describe, test, expect, beforeEach } from "bun:test";
import { CreateLote } from "./create-lote";
import { ListLotes } from "./list-lotes";
import { DeleteLote } from "./delete-lote";
import { AssignVehicle } from "./assign-vehicle";
import { TransferLote } from "./transfer-lote";
import { MarkLoteDelivered } from "./mark-lote-delivered";
import { ConfirmLoteReceipt } from "./confirm-lote-receipt";
import { InMemoryLoteRepository } from "../../infrastructure/persistence/in-memory-lote.repository";
import {
  LoteNotFoundError,
  VehicleHasNoDriverError,
  VehicleCapacityExceededError,
  LoteNotInTransitError,
  LoteAlreadyDeliveredError,
  LoteNotDeliveredError,
  LoteAlreadyReceivedError,
} from "../../domain/cargo/errors";

const hubA = { id: "hub-a", name: "Centro A" };
const hubB = { id: "hub-b", name: "Centro B" };
const vehicleWithDriver = { id: "veh-1", placa: "ABC123", capacidadCargaKg: 1000, choferId: "drv-1" };
const vehicleNoDriver = { id: "veh-2", placa: "XYZ999", capacidadCargaKg: 500, choferId: null };

const hubLookup = {
  async findHubById(id: string) {
    if (id === hubA.id) return hubA;
    if (id === hubB.id) return hubB;
    return null;
  },
};

const vehicleLookup = {
  async findVehicleById(id: string) {
    if (id === vehicleWithDriver.id) return vehicleWithDriver;
    if (id === vehicleNoDriver.id) return vehicleNoDriver;
    return null;
  },
};

describe("Lote use cases", () => {
  let repo: InMemoryLoteRepository;
  let createLote: CreateLote;
  let listLotes: ListLotes;
  let deleteLote: DeleteLote;
  let assignVehicle: AssignVehicle;
  let transferLote: TransferLote;
  let markLoteDelivered: MarkLoteDelivered;
  let confirmLoteReceipt: ConfirmLoteReceipt;

  beforeEach(() => {
    repo = new InMemoryLoteRepository();
    createLote = new CreateLote(repo, hubLookup);
    listLotes = new ListLotes(repo);
    deleteLote = new DeleteLote(repo);
    assignVehicle = new AssignVehicle(repo, vehicleLookup);
    transferLote = new TransferLote(repo, vehicleLookup);
    markLoteDelivered = new MarkLoteDelivered(repo);
    confirmLoteReceipt = new ConfirmLoteReceipt(repo);
  });

  // Lleva un lote recién creado hasta EN_TRANSITO (listo para entrega).
  async function loteEnTransito() {
    const lote = await createLote.execute({
      hubOrigenId: hubA.id,
      hubDestinoId: hubB.id,
      items: [{ productId: "p1", cantidad: 1, pesoKg: 50 }],
    });
    await assignVehicle.execute(lote.id, { vehiculoId: vehicleWithDriver.id });
    return lote.id;
  }

  test("creates a lote in EMBALADO state", async () => {
    const lote = await createLote.execute({
      hubOrigenId: hubA.id,
      items: [{ productId: "prod-1", cantidad: 10, pesoKg: 50 }],
    });
    expect(lote.estado).toBe("EMBALADO");
    expect(lote.hubOrigenId).toBe(hubA.id);
    expect(lote.vehiculoId).toBeNull();
  });

  test("lists all lotes", async () => {
    await createLote.execute({ hubOrigenId: hubA.id, items: [{ productId: "p1", cantidad: 5 }] });
    await createLote.execute({ hubOrigenId: hubB.id, items: [{ productId: "p2", cantidad: 3 }] });
    const all = await listLotes.execute();
    expect(all).toHaveLength(2);
  });

  test("filters lotes by hub", async () => {
    await createLote.execute({ hubOrigenId: hubA.id, items: [{ productId: "p1", cantidad: 1 }] });
    await createLote.execute({ hubOrigenId: hubB.id, items: [{ productId: "p2", cantidad: 1 }] });
    const fromA = await listLotes.execute(hubA.id);
    expect(fromA).toHaveLength(1);
  });

  test("assigns vehicle and changes state to EN_TRANSITO", async () => {
    const lote = await createLote.execute({
      hubOrigenId: hubA.id,
      items: [{ productId: "p1", cantidad: 1, pesoKg: 100 }],
    });
    const updated = await assignVehicle.execute(lote.id, { vehiculoId: vehicleWithDriver.id });
    expect(updated.estado).toBe("EN_TRANSITO");
    expect(updated.vehiculoId).toBe(vehicleWithDriver.id);
  });

  test("rejects vehicle without driver", async () => {
    const lote = await createLote.execute({ hubOrigenId: hubA.id, items: [{ productId: "p1", cantidad: 1 }] });
    await expect(
      assignVehicle.execute(lote.id, { vehiculoId: vehicleNoDriver.id })
    ).rejects.toBeInstanceOf(VehicleHasNoDriverError);
  });

  test("rejects assignment when vehicle over capacity", async () => {
    const lote = await createLote.execute({
      hubOrigenId: hubA.id,
      items: [{ productId: "p1", cantidad: 1, pesoKg: 1500 }],
    });
    await expect(
      assignVehicle.execute(lote.id, { vehiculoId: vehicleWithDriver.id })
    ).rejects.toBeInstanceOf(VehicleCapacityExceededError);
  });

  test("transfers lote to another vehicle", async () => {
    const lote = await createLote.execute({
      hubOrigenId: hubA.id,
      items: [{ productId: "p1", cantidad: 1, pesoKg: 50 }],
    });
    await assignVehicle.execute(lote.id, { vehiculoId: vehicleWithDriver.id });

    const vehicle2 = { id: "veh-3", placa: "TRF001", capacidadCargaKg: 2000, choferId: "drv-2" };
    const lookup2 = {
      async findVehicleById(id: string) {
        if (id === vehicle2.id) return vehicle2;
        return vehicleLookup.findVehicleById(id);
      },
    };
    const transfer = new TransferLote(repo, lookup2);
    const transferred = await transfer.execute(lote.id, { vehiculoDestinoId: vehicle2.id, motivo: "Cambio de ruta" });
    expect(transferred.vehiculoId).toBe(vehicle2.id);
    expect(transferred.estado).toBe("EN_TRANSITO");
  });

  test("throws LoteNotInTransitError when transferring EMBALADO lote", async () => {
    const lote = await createLote.execute({ hubOrigenId: hubA.id, items: [{ productId: "p1", cantidad: 1 }] });
    await expect(
      transferLote.execute(lote.id, { vehiculoDestinoId: vehicleWithDriver.id, motivo: "" })
    ).rejects.toBeInstanceOf(LoteNotInTransitError);
  });

  // --- Acto 1: entrega del ZODI_SENDER (EN_TRANSITO → ENTREGADO) ---

  test("marks a lote as ENTREGADO when in transit", async () => {
    const id = await loteEnTransito();
    const delivered = await markLoteDelivered.execute(id);
    expect(delivered.estado).toBe("ENTREGADO");
    expect(delivered.vehiculoId).toBeNull();
  });

  test("throws LoteNotInTransitError when delivering an EMBALADO lote", async () => {
    const lote = await createLote.execute({ hubOrigenId: hubA.id, items: [{ productId: "p1", cantidad: 1 }] });
    await expect(markLoteDelivered.execute(lote.id)).rejects.toBeInstanceOf(LoteNotInTransitError);
  });

  test("throws LoteAlreadyDeliveredError when delivering twice", async () => {
    const id = await loteEnTransito();
    await markLoteDelivered.execute(id);
    await expect(markLoteDelivered.execute(id)).rejects.toBeInstanceOf(LoteAlreadyDeliveredError);
  });

  // --- Acto 2: confirmación de recepción del ZODI_DESTINATION (ENTREGADO → RECIBIDO) ---

  test("confirms receipt and records who confirmed it", async () => {
    const id = await loteEnTransito();
    await markLoteDelivered.execute(id);
    const received = await confirmLoteReceipt.execute(id, "user-destino");
    expect(received.estado).toBe("RECIBIDO");
    expect(received.confirmadoPorId).toBe("user-destino");
    expect(received.confirmadoEn).not.toBeNull();
  });

  test("throws LoteNotDeliveredError when confirming a lote still in transit", async () => {
    const id = await loteEnTransito();
    await expect(confirmLoteReceipt.execute(id, "user-destino")).rejects.toBeInstanceOf(LoteNotDeliveredError);
  });

  test("throws LoteAlreadyReceivedError when confirming twice", async () => {
    const id = await loteEnTransito();
    await markLoteDelivered.execute(id);
    await confirmLoteReceipt.execute(id, "user-destino");
    await expect(confirmLoteReceipt.execute(id, "user-destino")).rejects.toBeInstanceOf(LoteAlreadyReceivedError);
  });

  test("throws LoteNotFoundError when confirming a missing lote", async () => {
    await expect(confirmLoteReceipt.execute("non-existent", "user-destino")).rejects.toBeInstanceOf(LoteNotFoundError);
  });

  test("deletes a lote", async () => {
    const lote = await createLote.execute({ hubOrigenId: hubA.id, items: [{ productId: "p1", cantidad: 1 }] });
    await deleteLote.execute(lote.id);
    const all = await listLotes.execute();
    expect(all).toHaveLength(0);
  });

  test("throws LoteNotFoundError on delete of missing lote", async () => {
    await expect(deleteLote.execute("non-existent")).rejects.toBeInstanceOf(LoteNotFoundError);
  });
});
