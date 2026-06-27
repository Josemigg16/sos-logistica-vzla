import { beforeEach, describe, expect, test } from "bun:test";
import { AddVehicleToConvoy } from "./add-vehicle-to-convoy";
import { Convoy } from "../../domain/convoys/entities/convoy";
import { ConvoyDomainError, ConvoyNotFoundError } from "../../domain/convoys/errors";
import { InMemoryConvoyRepository } from "../../infrastructure/persistence/in-memory-convoy.repository";

class CountingConvoyRepository extends InMemoryConvoyRepository {
  saveCount = 0;

  override async save(convoy: Convoy): Promise<void> {
    this.saveCount += 1;
    await super.save(convoy);
  }
}

const BASE_CONVOY = {
  id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
  origenId: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
  destinoId: "cccccccc-cccc-cccc-cccc-cccccccccccc",
  escoltaId: "dddddddd-dddd-dddd-dddd-dddddddddddd",
  vehicleIds: ["eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee"],
};

function makeConvoy(overrides: Partial<typeof BASE_CONVOY> = {}): Convoy {
  return Convoy.create({ ...BASE_CONVOY, ...overrides });
}

describe("AddVehicleToConvoy", () => {
  let convoys: CountingConvoyRepository;
  let addVehicle: AddVehicleToConvoy;

  beforeEach(() => {
    convoys = new CountingConvoyRepository();
    addVehicle = new AddVehicleToConvoy(convoys);
  });

  test("adds a vehicle to an existing PLANIFICADO convoy and saves after success", async () => {
    const convoy = makeConvoy();
    await convoys.save(convoy);
    convoys.saveCount = 0;

    const addedVehicleId = "ffffffff-ffff-ffff-ffff-ffffffffffff";
    const result = await addVehicle.execute({
      convoyId: convoy.id,
      vehicleId: addedVehicleId,
    });

    expect(result.vehicleIds).toEqual([...BASE_CONVOY.vehicleIds, addedVehicleId]);
    expect(convoys.saveCount).toBe(1);
  });

  test("throws ConvoyNotFoundError when convoy does not exist", async () => {
    await expect(
      addVehicle.execute({
        convoyId: "99999999-9999-9999-9999-999999999999",
        vehicleId: "ffffffff-ffff-ffff-ffff-ffffffffffff",
      }),
    ).rejects.toBeInstanceOf(ConvoyNotFoundError);

    expect(convoys.saveCount).toBe(0);
  });

  test("propagates DUPLICATE_VEHICLE from the entity and does not save", async () => {
    const convoy = makeConvoy();
    await convoys.save(convoy);
    convoys.saveCount = 0;

    await expect(
      addVehicle.execute({
        convoyId: convoy.id,
        vehicleId: BASE_CONVOY.vehicleIds[0]!,
      }),
    ).rejects.toMatchObject({ code: "DUPLICATE_VEHICLE" });
    await expect(
      addVehicle.execute({
        convoyId: convoy.id,
        vehicleId: BASE_CONVOY.vehicleIds[0]!,
      }),
    ).rejects.toBeInstanceOf(ConvoyDomainError);

    expect(convoys.saveCount).toBe(0);
  });

  test("propagates CONVOY_NOT_PLANIFICADO from the entity and does not save", async () => {
    const convoy = makeConvoy();
    convoy.dispatch();
    await convoys.save(convoy);
    convoys.saveCount = 0;

    await expect(
      addVehicle.execute({
        convoyId: convoy.id,
        vehicleId: "ffffffff-ffff-ffff-ffff-ffffffffffff",
      }),
    ).rejects.toMatchObject({ code: "CONVOY_NOT_PLANIFICADO" });
    await expect(
      addVehicle.execute({
        convoyId: convoy.id,
        vehicleId: "ffffffff-ffff-ffff-ffff-ffffffffffff",
      }),
    ).rejects.toBeInstanceOf(ConvoyDomainError);

    expect(convoys.saveCount).toBe(0);
  });
});
