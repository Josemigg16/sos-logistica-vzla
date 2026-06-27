import { beforeEach, describe, expect, test } from "bun:test";
import { RegisterHub } from "./register-hub";
import { ListHubs } from "./list-hubs";
import { StockResource } from "./stock-resource";
import { ListResourcesByHub } from "./list-resources-by-hub";
import { InMemoryHubRepository } from "../../infrastructure/persistence/in-memory-hub.repository";
import { InMemoryResourceRepository } from "../../infrastructure/persistence/in-memory-resource.repository";

describe("RegisterHub / ListHubs", () => {
  let hubs: InMemoryHubRepository;

  beforeEach(() => {
    hubs = new InMemoryHubRepository();
  });

  test("registra un hub y lo lista", async () => {
    const register = new RegisterHub(hubs);
    const list = new ListHubs(hubs);

    const hub = await register.execute({
      name: "Centro Catia",
      address: "Av. Principal",
      contact: "0212-555",
      type: "COLLECTION",
      latitude: 10.5,
      longitude: -66.9,
    });

    expect(hub.type).toBe("COLLECTION");
    const all = await list.execute();
    expect(all).toHaveLength(1);
    expect(all[0]!.name).toBe("Centro Catia");
  });
});

describe("StockResource / ListResourcesByHub", () => {
  let hubs: InMemoryHubRepository;
  let resources: InMemoryResourceRepository;

  beforeEach(() => {
    hubs = new InMemoryHubRepository();
    resources = new InMemoryResourceRepository();
  });

  test("suma stock a un hub existente y lo acumula por categoría", async () => {
    const hub = await new RegisterHub(hubs).execute({
      name: "Centro Sur",
      address: "Calle 1",
      contact: "x",
      type: "COLLECTION",
      latitude: 10,
      longitude: -66,
    });
    const stock = new StockResource(hubs, resources);

    await stock.execute({ hubId: hub.id, category: "Víveres", quantity: 10, unit: "kg" });
    await stock.execute({ hubId: hub.id, category: "Víveres", quantity: 5, unit: "kg" });

    const list = await new ListResourcesByHub(resources).execute(hub.id);
    expect(list).toHaveLength(1);
    expect(list[0]!.quantity).toBe(15);
  });

  test("rechaza stockear en un hub inexistente", async () => {
    const stock = new StockResource(hubs, resources);
    await expect(
      stock.execute({ hubId: crypto.randomUUID(), category: "Víveres", quantity: 1, unit: "kg" }),
    ).rejects.toThrow();
  });
});
