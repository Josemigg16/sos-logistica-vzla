import { beforeEach, describe, expect, test } from "bun:test";
import { RegisterHub } from "./register-hub";
import { ListHubs } from "./list-hubs";
import { GetHubByCoordinator } from "./get-hub-by-coordinator";
import { StockResource } from "./stock-resource";
import { ListResourcesByHub } from "./list-resources-by-hub";
import { InMemoryHubRepository } from "../../infrastructure/persistence/in-memory-hub.repository";
import { InMemoryResourceRepository } from "../../infrastructure/persistence/in-memory-resource.repository";
import { InMemoryProductRepository } from "../../infrastructure/persistence/in-memory-product.repository";
import { Product } from "../../domain/resources/entities/product";
import { InMemoryInventoryBatchRepository } from "../../infrastructure/persistence/in-memory-inventory-batch.repository";


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
  let products: InMemoryProductRepository;
  let batches: InMemoryInventoryBatchRepository;
  let arroz: { id: string };

  beforeEach(async () => {
    hubs = new InMemoryHubRepository();
    resources = new InMemoryResourceRepository();
    products = new InMemoryProductRepository();
    batches = new InMemoryInventoryBatchRepository();
    const product = Product.create({
      id: crypto.randomUUID(),
      name: "Arroz blanco",
      category: "Víveres",
      unit: "kg",
      description: "",
    });
    await products.save(product);
    arroz = { id: product.id };
  });

  test("suma stock de un producto y lo acumula", async () => {
    const hub = await new RegisterHub(hubs).execute({
      name: "Centro Sur",
      address: "Calle 1",
      contact: "x",
      type: "COLLECTION",
      latitude: 10,
      longitude: -66,
    });
    const stock = new StockResource(hubs, resources, products, batches);

    await stock.execute({ hubId: hub.id, productId: arroz.id, quantity: 10 });
    const second = await stock.execute({ hubId: hub.id, productId: arroz.id, quantity: 5 });

    expect(second.productName).toBe("Arroz blanco");
    expect(second.category).toBe("Víveres");
    expect(second.unit).toBe("kg");

    const list = await new ListResourcesByHub(resources).execute(hub.id);
    expect(list).toHaveLength(1);
    expect(list[0]!.quantity).toBe(15);

    // Verificar que se guardaron los batches en el histórico de ingresos
    const batchList = await batches.findByHub(hub.id);
    expect(batchList).toHaveLength(2);
    expect(batchList[0]!.quantityBatches).toBe(10);
    expect(batchList[1]!.quantityBatches).toBe(5);
  });

  test("rechaza stockear en un hub inexistente", async () => {
    const stock = new StockResource(hubs, resources, products, batches);
    await expect(
      stock.execute({ hubId: crypto.randomUUID(), productId: arroz.id, quantity: 1 }),
    ).rejects.toThrow();
  });

  test("rechaza stockear un producto inexistente", async () => {
    const hub = await new RegisterHub(hubs).execute({
      name: "Centro Norte",
      address: "Calle 2",
      contact: "x",
      type: "COLLECTION",
      latitude: 11,
      longitude: -67,
    });
    const stock = new StockResource(hubs, resources, products, batches);
    await expect(
      stock.execute({ hubId: hub.id, productId: crypto.randomUUID(), quantity: 1 }),
    ).rejects.toThrow();
  });
});
