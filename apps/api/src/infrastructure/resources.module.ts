import { RegisterHub } from "../application/resources/register-hub";
import { ListHubs } from "../application/resources/list-hubs";
import { StockResource } from "../application/resources/stock-resource";
import { ListResourcesByHub } from "../application/resources/list-resources-by-hub";
import { DrizzleHubRepository } from "./persistence/drizzle-hub.repository";
import { DrizzleResourceRepository } from "./persistence/drizzle-resource.repository";
import { createResourceRoutes } from "./http/resources.routes";

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
