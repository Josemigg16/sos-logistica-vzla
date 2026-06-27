import { describe, expect, test } from "bun:test";
import { Convoy } from "../../domain/convoys/entities/convoy";
import { InMemoryConvoyRepository } from "./in-memory-convoy.repository";

const makeConvoy = (status: "PLANIFICADO" | "EN_RUTA" = "PLANIFICADO") => {
  const convoy = Convoy.create({
    id: crypto.randomUUID(),
    origenId: crypto.randomUUID(),
    destinoId: crypto.randomUUID(),
    escoltaNombre: "Juan Perez",
    escoltaCedula: "V-12345678",
    vehicleIds: [crypto.randomUUID()],
  });

  if (status === "EN_RUTA") convoy.dispatch();
  return convoy;
};

describe("InMemoryConvoyRepository", () => {
  test("round-trips a saved convoy by id", async () => {
    const repo = new InMemoryConvoyRepository();
    const convoy = makeConvoy();

    await repo.save(convoy);

    const found = await repo.findById(convoy.id);
    expect(found?.id).toBe(convoy.id);
    expect(found?.status).toBe("PLANIFICADO");
    expect(found?.vehicleIds).toEqual(convoy.vehicleIds);
    expect(found?.origenId).toBe(convoy.origenId);
    expect(found?.destinoId).toBe(convoy.destinoId);
    expect(found?.escoltaNombre).toBe(convoy.escoltaNombre);
    expect(found?.escoltaCedula).toBe(convoy.escoltaCedula);
  });

  test("filters convoys by status", async () => {
    const repo = new InMemoryConvoyRepository();
    const planned = makeConvoy();
    const active = makeConvoy("EN_RUTA");
    await repo.save(planned);
    await repo.save(active);

    const activeOnly = await repo.findAll({ status: "EN_RUTA" });

    expect(activeOnly).toHaveLength(1);
    expect(activeOnly[0]?.id).toBe(active.id);
  });

  test("returns null for an unknown id", async () => {
    const repo = new InMemoryConvoyRepository();

    await expect(repo.findById(crypto.randomUUID())).resolves.toBeNull();
  });
});
