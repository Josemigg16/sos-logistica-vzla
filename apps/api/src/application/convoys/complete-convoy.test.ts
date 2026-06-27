import { beforeEach, describe, expect, test } from "bun:test";
import { Convoy } from "../../domain/convoys/entities/convoy";
import {
  ConvoyNotFoundError,
  InvalidConvoyTransitionError,
} from "../../domain/convoys/errors";
import { InMemoryConvoyRepository } from "../../infrastructure/persistence/in-memory-convoy.repository";
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
  let completeConvoy: CompleteConvoy;

  beforeEach(() => {
    convoys = new CountingConvoyRepository();
    completeConvoy = new CompleteConvoy(convoys);
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
