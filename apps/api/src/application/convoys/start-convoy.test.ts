import { beforeEach, describe, expect, test } from "bun:test";
import { Convoy } from "../../domain/convoys/entities/convoy";
import {
  ConvoyNotFoundError,
  InvalidConvoyTransitionError,
} from "../../domain/convoys/errors";
import { InMemoryConvoyRepository } from "../../infrastructure/persistence/in-memory-convoy.repository";
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
  let startConvoy: StartConvoy;

  beforeEach(() => {
    convoys = new CountingConvoyRepository();
    startConvoy = new StartConvoy(convoys);
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
