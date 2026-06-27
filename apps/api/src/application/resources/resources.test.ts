import { beforeEach, describe, expect, test } from "bun:test";
import { RegisterHub } from "./register-hub";
import { ListHubs } from "./list-hubs";
import { GetHubByCoordinator } from "./get-hub-by-coordinator";
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
    expect(hub.coordinatorId).toBeNull();
    const all = await list.execute();
    expect(all).toHaveLength(1);
    expect(all[0]!.name).toBe("Centro Catia");
  });
});

describe("GetHubByCoordinator", () => {
  let hubs: InMemoryHubRepository;

  beforeEach(() => {
    hubs = new InMemoryHubRepository();
  });

  test("devuelve el hub asociado a un coordinador", async () => {
    const register = new RegisterHub(hubs);
    const getMine = new GetHubByCoordinator(hubs);

    const created = await register.execute({
      name: "Centro Coordinador",
      address: "Calle 2",
      contact: "x",
      type: "COLLECTION",
      latitude: 9,
      longitude: -67,
      coordinatorId: "coord-1",
    });

    expect(created.coordinatorId).toBe("coord-1");
    const mine = await getMine.execute("coord-1");
    expect(mine?.id).toBe(created.id);
  });

  test("devuelve null cuando el coordinador no tiene hub", async () => {
    const getMine = new GetHubByCoordinator(hubs);
    expect(await getMine.execute("sin-hub")).toBeNull();
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
