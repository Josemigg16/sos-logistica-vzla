import { beforeEach, describe, expect, test } from "bun:test";
import { Convoy } from "../../domain/convoys/entities/convoy";
import { Lote } from "../../domain/cargo/entities/lote";
import {
  ConvoyNotFoundError,
  InvalidConvoyTransitionError,
} from "../../domain/convoys/errors";
import { InMemoryConvoyRepository } from "../../infrastructure/persistence/in-memory-convoy.repository";
import { InMemoryLoteRepository } from "../../infrastructure/persistence/in-memory-lote.repository";
import { ConfirmConvoyArrival } from "./confirm-convoy-arrival";

const BASE_PROPS = {
  id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
  origenId: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
  destinoId: "cccccccc-cccc-cccc-cccc-cccccccccccc",
  escoltaNombre: "Juan Perez",
  escoltaCedula: "V-12345678",
  vehicleIds: ["eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee"],
};

class CountingConvoyRepository extends InMemoryConvoyRepository {
  saveCount = 0;

  override async save(convoy: Convoy): Promise<void> {
    this.saveCount += 1;
    await super.save(convoy);
  }
}

function makeConvoy(status: "PLANIFICADO" | "EN_RUTA" | "ENTREGADO" = "ENTREGADO"): Convoy {
  const convoy = Convoy.create(BASE_PROPS);
  if (status === "EN_RUTA" || status === "ENTREGADO") convoy.dispatch();
  if (status === "ENTREGADO") convoy.deliver();
  return convoy;
}

describe("ConfirmConvoyArrival", () => {
  let convoys: CountingConvoyRepository;
  let lotes: InMemoryLoteRepository;
  let confirmArrival: ConfirmConvoyArrival;

  beforeEach(() => {
    convoys = new CountingConvoyRepository();
    lotes = new InMemoryLoteRepository();
    confirmArrival = new ConfirmConvoyArrival(convoys, lotes);
  });

  test("confirms arrival of an ENTREGADO convoy and stamps all its lotes as RECIBIDO", async () => {
    const convoy = makeConvoy("ENTREGADO");
    await convoys.save(convoy);
    convoys.saveCount = 0;

    // Crear un lote en estado ENTREGADO asignado al convoy
    const lote = Lote.rehydrate({
      id: "lote-1",
      hubOrigenId: "hub-1",
      hubOrigenNombre: "Hub 1",
      hubDestinoId: "hub-2",
      hubDestinoNombre: "Hub 2",
      vehiculoId: null,
      vehiculoPlaca: null,
      convoyId: convoy.id,
      estado: "ENTREGADO",
      nota: null,
      pesoTotalKg: 100,
      creadoPorId: "user-1",
      confirmadoPorId: null,
      confirmadoEn: null,
      items: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await lotes.save(lote);

    const result = await confirmArrival.execute({ id: convoy.id, actorId: "actor-123" });

    expect(result.status).toBe("RECIBIDO");
    expect(convoys.saveCount).toBe(1);
    expect((await convoys.findById(convoy.id))?.status).toBe("RECIBIDO");

    const updatedLote = await lotes.findById("lote-1");
    expect(updatedLote?.estado).toBe("RECIBIDO");
    expect(updatedLote?.confirmadoPorId).toBe("actor-123");
    expect(updatedLote?.confirmadoEn).not.toBeNull();
  });

  test("throws ConvoyNotFoundError when convoy does not exist", async () => {
    await expect(
      confirmArrival.execute({ id: "missing-convoy", actorId: "actor-123" })
    ).rejects.toBeInstanceOf(ConvoyNotFoundError);
  });

  test("throws InvalidConvoyTransitionError when convoy is not ENTREGADO", async () => {
    const convoy = makeConvoy("PLANIFICADO");
    await convoys.save(convoy);

    await expect(
      confirmArrival.execute({ id: convoy.id, actorId: "actor-123" })
    ).rejects.toBeInstanceOf(InvalidConvoyTransitionError);
  });

  test("ignores EN_TRANSITO lotes and still transitions the convoy to RECIBIDO", async () => {
    const convoy = makeConvoy("ENTREGADO");
    await convoys.save(convoy);

    const loteEnTransito = Lote.rehydrate({
      id: "lote-pending",
      hubOrigenId: "hub-1",
      hubOrigenNombre: "Hub 1",
      hubDestinoId: "hub-2",
      hubDestinoNombre: "Hub 2",
      vehiculoId: "veh-1",
      vehiculoPlaca: "ABC-123",
      convoyId: convoy.id,
      estado: "EN_TRANSITO",
      nota: null,
      pesoTotalKg: 100,
      creadoPorId: "user-1",
      confirmadoPorId: null,
      confirmadoEn: null,
      items: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await lotes.save(loteEnTransito);

    const result = await confirmArrival.execute({ id: convoy.id, actorId: "actor-123" });

    expect(result.status).toBe("RECIBIDO");
    expect((await convoys.findById(convoy.id))?.status).toBe("RECIBIDO");

    // El lote EN_TRANSITO queda intacto
    const loteAfter = await lotes.findById("lote-pending");
    expect(loteAfter?.estado).toBe("EN_TRANSITO");
    expect(loteAfter?.confirmadoPorId).toBeNull();
  });
});
