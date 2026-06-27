import { beforeEach, describe, expect, test } from "bun:test";
import { ListConvoys } from "./list-convoys";
import { Convoy } from "../../domain/convoys/entities/convoy";
import { InMemoryConvoyRepository } from "../../infrastructure/persistence/in-memory-convoy.repository";

function makeConvoy(id: string): Convoy {
  return Convoy.create({
    id,
    origenId: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
    destinoId: "cccccccc-cccc-cccc-cccc-cccccccccccc",
    escoltaNombre: "Juan Perez",
    escoltaCedula: "V-12345678",
    vehicleIds: [crypto.randomUUID()],
  });
}

describe("ListConvoys", () => {
  let convoys: InMemoryConvoyRepository;
  let listConvoys: ListConvoys;

  beforeEach(() => {
    convoys = new InMemoryConvoyRepository();
    listConvoys = new ListConvoys(convoys);
  });

  test("returns all convoys when no filter is provided", async () => {
    await convoys.save(makeConvoy("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"));
    await convoys.save(makeConvoy("99999999-9999-9999-9999-999999999999"));

    const result = await listConvoys.execute();

    expect(result).toHaveLength(2);
    expect(result.map((convoy) => convoy.id)).toEqual([
      "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      "99999999-9999-9999-9999-999999999999",
    ]);
  });

  test("returns only convoys matching the status filter", async () => {
    const planificado = makeConvoy("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");
    const enRuta = makeConvoy("99999999-9999-9999-9999-999999999999");
    enRuta.dispatch();
    await convoys.save(planificado);
    await convoys.save(enRuta);

    const result = await listConvoys.execute({ status: "EN_RUTA" });

    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe(enRuta.id);
    expect(result[0]!.status).toBe("EN_RUTA");
  });
});
