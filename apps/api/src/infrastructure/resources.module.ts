import { RegisterHub } from "../application/resources/register-hub";
import { ListHubs } from "../application/resources/list-hubs";
import { StockResource } from "../application/resources/stock-resource";
import { ListResourcesByHub } from "../application/resources/list-resources-by-hub";
import { UpsertHub } from "../application/resources/upsert-hub";
import { ReplaceHubInventory } from "../application/resources/replace-hub-inventory";
import { DeleteHub } from "../application/resources/delete-hub";
import { DrizzleHubRepository } from "./persistence/drizzle-hub.repository";
import { DrizzleResourceRepository } from "./persistence/drizzle-resource.repository";
import { createResourceRoutes } from "./http/resources.routes";
import { createCentrosRoutes } from "./http/centros.routes";

/**
 * Composition root del bounded context `resources`.
 */
export function createResourcesModule() {
  const hubs = new DrizzleHubRepository();
  const resources = new DrizzleResourceRepository();

  const useCases = {
    registerHub: new RegisterHub(hubs),
    listHubs: new ListHubs(hubs),
    stockResource: new StockResource(hubs, resources),
    listResourcesByHub: new ListResourcesByHub(resources),
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
