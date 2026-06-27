import { beforeEach, describe, expect, test } from "bun:test";
import { RegisterInventoryBatch } from "./register-inventory-batch";
import { ListInventoryBatchesByHub } from "./list-inventory-batches-by-hub";
import { GetHubStockSummary } from "./get-hub-stock-summary";
import { DeleteInventoryBatch } from "./delete-inventory-batch";
import { InMemoryHubRepository } from "../../infrastructure/persistence/in-memory-hub.repository";
import { InMemoryProductRepository } from "../../infrastructure/persistence/in-memory-product.repository";
import { InMemoryInventoryBatchRepository } from "../../infrastructure/persistence/in-memory-inventory-batch.repository";
import { Hub } from "../../domain/resources/entities/hub";
import { Product } from "../../domain/resources/entities/product";
import {
  HubNotFoundError,
  InvalidBatchQuantityError,
  InventoryBatchNotFoundError,
  ProductNotFoundError,
} from "../../domain/resources/errors";

describe("InventoryBatch use cases", () => {
  let hubs: InMemoryHubRepository;
  let products: InMemoryProductRepository;
  let batches: InMemoryInventoryBatchRepository;
  let register: RegisterInventoryBatch;
  let listByHub: ListInventoryBatchesByHub;
  let summary: GetHubStockSummary;
  let remove: DeleteInventoryBatch;

  let hubId: string;
  let agua: string;
  let arroz: string;

  beforeEach(async () => {
    hubs = new InMemoryHubRepository();
    products = new InMemoryProductRepository();
    batches = new InMemoryInventoryBatchRepository();
    register = new RegisterInventoryBatch(hubs, products, batches);
    listByHub = new ListInventoryBatchesByHub(batches);
    summary = new GetHubStockSummary(hubs, products, batches);
    remove = new DeleteInventoryBatch(batches);

    hubId = crypto.randomUUID();
    await hubs.save(
      Hub.register({
        id: hubId,
        name: "Centro Catia",
        address: "Av. Principal",
        contact: "0212-555",
        type: "COLLECTION",
        latitude: 10.5,
        longitude: -66.9,
      }),
    );

    agua = crypto.randomUUID();
    arroz = crypto.randomUUID();
    await products.save(
      Product.create({
        id: agua,
        name: "Agua embotellada",
        category: "Víveres",
        unit: "litros",
        description: "",
      }),
    );
    await products.save(
      Product.create({
        id: arroz,
        name: "Arroz blanco",
        category: "Víveres",
        unit: "kg",
        description: "",
      }),
    );
  });

  test("registra un lote en un hub existente", async () => {
    const batch = await register.execute({
      hubId,
      productId: agua,
      quantityBatches: 10,
    });
    expect(batch.quantityBatches).toBe(10);
    expect(batch.hubId).toBe(hubId);
    expect(batch.sourceHubId).toBeNull();
  });

  test("rechaza registrar en un hub inexistente", async () => {
    await expect(
      register.execute({
        hubId: crypto.randomUUID(),
        productId: agua,
        quantityBatches: 5,
      }),
    ).rejects.toBeInstanceOf(HubNotFoundError);
  });

  test("rechaza registrar con producto inexistente", async () => {
    await expect(
      register.execute({
        hubId,
        productId: crypto.randomUUID(),
        quantityBatches: 5,
      }),
    ).rejects.toBeInstanceOf(ProductNotFoundError);
  });

  test("rechaza cantidades no positivas", async () => {
    await expect(
      register.execute({ hubId, productId: agua, quantityBatches: 0 }),
    ).rejects.toBeInstanceOf(InvalidBatchQuantityError);
  });

  test("lista los batches de un hub ordenados por fecha descendente", async () => {
    await register.execute({ hubId, productId: agua, quantityBatches: 3 });
    await register.execute({ hubId, productId: arroz, quantityBatches: 7 });
    const list = await listByHub.execute(hubId);
    expect(list).toHaveLength(2);
  });

  test("suma stock por producto al pedir el summary", async () => {
    await register.execute({ hubId, productId: agua, quantityBatches: 3 });
    await register.execute({ hubId, productId: agua, quantityBatches: 5 });
    await register.execute({ hubId, productId: arroz, quantityBatches: 12 });

    const lines = await summary.execute(hubId);
    const aguaLine = lines.find((l) => l.productId === agua);
    const arrozLine = lines.find((l) => l.productId === arroz);
    expect(aguaLine?.totalBatches).toBe(8);
    expect(arrozLine?.totalBatches).toBe(12);
    expect(aguaLine?.productName).toBe("Agua embotellada");
  });

  test("summary rechaza hub inexistente", async () => {
    await expect(summary.execute(crypto.randomUUID())).rejects.toBeInstanceOf(
      HubNotFoundError,
    );
  });

  test("eliminar un batch corrige el stock agregado", async () => {
    const a = await register.execute({
      hubId,
      productId: agua,
      quantityBatches: 4,
    });
    await register.execute({ hubId, productId: agua, quantityBatches: 6 });

    await remove.execute(a.id);
    const lines = await summary.execute(hubId);
    expect(lines.find((l) => l.productId === agua)?.totalBatches).toBe(6);
  });

  test("eliminar un batch inexistente arroja error", async () => {
    await expect(remove.execute(crypto.randomUUID())).rejects.toBeInstanceOf(
      InventoryBatchNotFoundError,
    );
  });
});
