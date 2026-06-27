import { beforeEach, describe, expect, test } from "bun:test";
import { Convoy } from "../../domain/convoys/entities/convoy";
import {
  ConvoyNotFoundError,
  InvalidConvoyTransitionError,
} from "../../domain/convoys/errors";
import { InMemoryConvoyRepository } from "../../infrastructure/persistence/in-memory-convoy.repository";
import { InMemoryLoteRepository } from "../../infrastructure/persistence/in-memory-lote.repository";
import { Lote } from "../../domain/cargo/entities/lote";
import { CompleteConvoy } from "./complete-convoy";

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

function makeConvoy(status: "PLANIFICADO" | "EN_RUTA"): Convoy {
  const convoy = Convoy.create(BASE_PROPS);
  if (status === "EN_RUTA") convoy.dispatch();
  return convoy;
}

describe("CompleteConvoy", () => {
  let convoys: CountingConvoyRepository;
  let lotes: InMemoryLoteRepository;
  let completeConvoy: CompleteConvoy;

  beforeEach(() => {
    convoys = new CountingConvoyRepository();
    lotes = new InMemoryLoteRepository();
    completeConvoy = new CompleteConvoy(convoys, lotes);
  });

  test("delivers an in-transit convoy and persists the updated convoy", async () => {
    const convoy = makeConvoy("EN_RUTA");
    await convoys.save(convoy);
    convoys.saveCount = 0;

    const result = await completeConvoy.execute({ id: convoy.id });

    expect(result.status).toBe("ENTREGADO");
    expect(result.id).toBe(convoy.id);
    expect(convoys.saveCount).toBe(1);
    expect((await convoys.findById(convoy.id))?.status).toBe("ENTREGADO");
  });

  test("automatically marks lots assigned to the convoy as ENTREGADO when convoy completes", async () => {
    const convoy = makeConvoy("EN_RUTA");
    await convoys.save(convoy);

    // Create a lot assigned to the vehicle/convoy in transit
    const lote = Lote.create({
      id: "lote-12345-67890",
      hubOrigenId: convoy.origenId,
      hubOrigenNombre: "Centro de Despacho",
      hubDestinoId: convoy.destinoId,
      hubDestinoNombre: "Centro de Acopio",
      items: [
        {
          id: "item-1",
          loteId: "lote-12345-67890",
          productId: "prod-1",
          productName: "Arroz",
          cantidad: 100,
          pesoKg: 50,
        },
      ],
    });
    lote.assignVehicle(convoy.vehicleIds[0]!, "ABC-123");
    lote.assignToConvoy(convoy.id);
    await lotes.save(lote);

    const result = await completeConvoy.execute({ id: convoy.id });

    expect(result.status).toBe("ENTREGADO");
    const updatedLote = await lotes.findById(lote.id);
    expect(updatedLote?.estado).toBe("ENTREGADO");
  });

  test("throws ConvoyNotFoundError when the convoy does not exist", async () => {
    await expect(
      completeConvoy.execute({ id: "missing-convoy" }),
    ).rejects.toBeInstanceOf(ConvoyNotFoundError);
    expect(convoys.saveCount).toBe(0);
  });

  test("throws invalid transition and does not save when convoy is not in transit", async () => {
    const convoy = makeConvoy("PLANIFICADO");
    await convoys.save(convoy);
    convoys.saveCount = 0;

    await expect(completeConvoy.execute({ id: convoy.id })).rejects.toBeInstanceOf(
      InvalidConvoyTransitionError,
    );
    expect(convoys.saveCount).toBe(0);
    expect((await convoys.findById(convoy.id))?.status).toBe("PLANIFICADO");
  });
});
