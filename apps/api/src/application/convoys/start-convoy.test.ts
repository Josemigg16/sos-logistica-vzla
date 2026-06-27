import { beforeEach, describe, expect, test } from "bun:test";
import { Convoy } from "../../domain/convoys/entities/convoy";
import { Lote } from "../../domain/cargo/entities/lote";
import {
  ConvoyNotFoundError,
  InvalidConvoyTransitionError,
} from "../../domain/convoys/errors";
import { InMemoryConvoyRepository } from "../../infrastructure/persistence/in-memory-convoy.repository";
import { InMemoryLoteRepository } from "../../infrastructure/persistence/in-memory-lote.repository";
import { StartConvoy } from "./start-convoy";

const BASE_PROPS = {
  id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
  origenId: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
  destinoId: "cccccccc-cccc-cccc-cccc-cccccccccccc",
  escoltaId: "dddddddd-dddd-dddd-dddd-dddddddddddd",
  vehicleIds: ["eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee"],
};

class CountingConvoyRepository extends InMemoryConvoyRepository {
  saveCount = 0;

  override async save(convoy: Convoy): Promise<void> {
    this.saveCount += 1;
    await super.save(convoy);
  }
}

function makeConvoy(status: "PLANIFICADO" | "EN_RUTA" = "PLANIFICADO"): Convoy {
  const convoy = Convoy.create(BASE_PROPS);
  if (status === "EN_RUTA") convoy.dispatch();
  return convoy;
}

describe("StartConvoy", () => {
  let convoys: CountingConvoyRepository;
  let lotes: InMemoryLoteRepository;
  let startConvoy: StartConvoy;

  beforeEach(() => {
    convoys = new CountingConvoyRepository();
    lotes = new InMemoryLoteRepository();
    startConvoy = new StartConvoy(convoys, lotes);
  });

  test("dispatches a planned convoy and persists the updated convoy", async () => {
    const convoy = makeConvoy();
    await convoys.save(convoy);
    convoys.saveCount = 0;

    const result = await startConvoy.execute({ id: convoy.id });

    expect(result.status).toBe("EN_RUTA");
    expect(result.id).toBe(convoy.id);
    expect(convoys.saveCount).toBe(1);
    expect((await convoys.findById(convoy.id))?.status).toBe("EN_RUTA");
  });

  test("stamps convoyId on all lotes in transit on convoy vehicles upon dispatch", async () => {
    const convoy = makeConvoy();
    await convoys.save(convoy);

    // Crear un lote en tránsito en el vehículo del convoy
    const lote = Lote.rehydrate({
      id: "lote-123",
      hubOrigenId: "hub-1",
      hubOrigenNombre: "Hub 1",
      hubDestinoId: "hub-2",
      hubDestinoNombre: "Hub 2",
      vehiculoId: BASE_PROPS.vehicleIds[0]!,
      vehiculoPlaca: "ABC-123",
      convoyId: null,
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
    await lotes.save(lote);

    await startConvoy.execute({ id: convoy.id });

    const updatedLote = await lotes.findById("lote-123");
    expect(updatedLote?.convoyId).toBe(convoy.id);
  });

  test("throws ConvoyNotFoundError when the convoy does not exist", async () => {
    await expect(startConvoy.execute({ id: "missing-convoy" })).rejects.toBeInstanceOf(
      ConvoyNotFoundError,
    );
    expect(convoys.saveCount).toBe(0);
  });

  test("throws invalid transition and does not save when convoy is not planned", async () => {
    const convoy = makeConvoy("EN_RUTA");
    await convoys.save(convoy);
    convoys.saveCount = 0;

    await expect(startConvoy.execute({ id: convoy.id })).rejects.toBeInstanceOf(
      InvalidConvoyTransitionError,
    );
    expect(convoys.saveCount).toBe(0);
    expect((await convoys.findById(convoy.id))?.status).toBe("EN_RUTA");
  });
});
