import { beforeEach, describe, expect, test } from "bun:test";
import { GetConvoy } from "./get-convoy";
import { Convoy } from "../../domain/convoys/entities/convoy";
import { ConvoyNotFoundError } from "../../domain/convoys/errors";
import { InMemoryConvoyRepository } from "../../infrastructure/persistence/in-memory-convoy.repository";

describe("GetConvoy", () => {
  let convoys: InMemoryConvoyRepository;
  let getConvoy: GetConvoy;

  beforeEach(() => {
    convoys = new InMemoryConvoyRepository();
    getConvoy = new GetConvoy(convoys);
  });

  test("returns a convoy projection preserving vehicle insertion order", async () => {
    const vehicleIds = [
      "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee",
      "ffffffff-ffff-ffff-ffff-ffffffffffff",
      "11111111-1111-1111-1111-111111111111",
    ];
    const convoy = Convoy.create({
      id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      origenId: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
      destinoId: "cccccccc-cccc-cccc-cccc-cccccccccccc",
      escoltaNombre: "Juan Perez",
      escoltaCedula: "V-12345678",
      vehicleIds,
    });
    await convoys.save(convoy);

    const result = await getConvoy.execute({ id: convoy.id });

    expect(result.id).toBe(convoy.id);
    expect(result.vehicleIds).toEqual(vehicleIds);
  });

  test("throws ConvoyNotFoundError when convoy does not exist", async () => {
    await expect(
      getConvoy.execute({ id: "99999999-9999-9999-9999-999999999999" }),
    ).rejects.toBeInstanceOf(ConvoyNotFoundError);
  });
});
