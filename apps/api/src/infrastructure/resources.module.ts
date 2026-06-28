import { RegisterHub } from "../application/resources/register-hub";
import { ListHubs } from "../application/resources/list-hubs";
import { GetHubByCoordinator } from "../application/resources/get-hub-by-coordinator";
import { StockResource } from "../application/resources/stock-resource";
import { ListResourcesByHub } from "../application/resources/list-resources-by-hub";
import { UpsertHub } from "../application/resources/upsert-hub";
import { ReplaceHubInventory } from "../application/resources/replace-hub-inventory";
import { DeleteHub } from "../application/resources/delete-hub";
import { RegisterInventoryBatch } from "../application/resources/register-inventory-batch";
import { ListInventoryBatchesByHub } from "../application/resources/list-inventory-batches-by-hub";
import { GetHubStockSummary } from "../application/resources/get-hub-stock-summary";
import { DeleteInventoryBatch } from "../application/resources/delete-inventory-batch";
import { ChangeHubStatus } from "../application/resources/change-hub-status";
import { UpdateHubNeeds } from "../application/resources/update-hub-needs";
import { DrizzleHubRepository } from "./persistence/drizzle-hub.repository";
import { DrizzleResourceRepository } from "./persistence/drizzle-resource.repository";
import { DrizzleProductRepository } from "./persistence/drizzle-product.repository";
import { DrizzleInventoryBatchRepository } from "./persistence/drizzle-inventory-batch.repository";
import { createResourceRoutes } from "./http/resources.routes";
import { createCentrosRoutes } from "./http/centros.routes";

/**
 * Composition root del bounded context `resources`.
 */
export function createResourcesModule() {
  const hubs = new DrizzleHubRepository();
  const resources = new DrizzleResourceRepository();
  const products = new DrizzleProductRepository();
  const batches = new DrizzleInventoryBatchRepository();

  const useCases = {
    registerHub: new RegisterHub(hubs),
    listHubs: new ListHubs(hubs),
    getHubByCoordinator: new GetHubByCoordinator(hubs),
    stockResource: new StockResource(hubs, resources, products, batches),
    listResourcesByHub: new ListResourcesByHub(resources),
    registerInventoryBatch: new RegisterInventoryBatch(hubs, products, batches),
    listInventoryBatchesByHub: new ListInventoryBatchesByHub(batches),
    getHubStockSummary: new GetHubStockSummary(hubs, products, batches),
    deleteInventoryBatch: new DeleteInventoryBatch(batches),
    changeHubStatus: new ChangeHubStatus(hubs),
    updateHubNeeds: new UpdateHubNeeds(hubs),
    hubRepository: hubs,
  };

  return {
    useCases,
    routes: createResourceRoutes(useCases),
  };
}

/**
 * Composition root for the /centros ACL routes (Strangler Fig).
 * Wires the same Drizzle repos as createResourcesModule().
 * The orchestrator mounts this at `/centros` and removes the legacy handlers.
 */
export function createCentrosModule() {
  const hubs = new DrizzleHubRepository();
  const resources = new DrizzleResourceRepository();

  const useCases = {
    listHubs: new ListHubs(hubs),
    listResourcesByHub: new ListResourcesByHub(resources),
    upsertHub: new UpsertHub(hubs),
    replaceHubInventory: new ReplaceHubInventory(hubs, resources),
    deleteHub: new DeleteHub(hubs, resources),
  };

  return {
    useCases,
    routes: createCentrosRoutes(useCases),
  };
}
