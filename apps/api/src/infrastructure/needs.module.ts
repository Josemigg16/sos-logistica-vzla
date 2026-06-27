import { CreateNeed } from "../application/needs/create-need";
import { ListNeeds } from "../application/needs/list-needs";
import { UpdateNeed } from "../application/needs/update-need";
import { DeleteNeed } from "../application/needs/delete-need";
import { PublishNeed } from "../application/needs/publish-need";
import { BulkCreateNeeds } from "../application/needs/bulk-create-needs";
import { DrizzleNeedRepository } from "./persistence/drizzle-need.repository";
import { DrizzleProductCatalogRepository } from "./persistence/drizzle-product-catalog.repository";
import { createNeedsRoutes } from "./http/needs.routes";

/**
 * Composition root del slice `needs` dentro del bounded context `resources`.
 * Ensambla repositorios Drizzle y use cases; devuelve el router Hono listo
 * para montarse en index.ts con: app.route("/", createNeedsModule().routes)
 */
export function createNeedsModule() {
  const needRepo = new DrizzleNeedRepository();
  const productCatalog = new DrizzleProductCatalogRepository();
  const createNeed = new CreateNeed(needRepo, productCatalog);

  const useCases = {
    createNeed,
    listNeeds: new ListNeeds(needRepo),
    updateNeed: new UpdateNeed(needRepo),
    deleteNeed: new DeleteNeed(needRepo),
    publishNeed: new PublishNeed(needRepo),
    bulkCreateNeeds: new BulkCreateNeeds(createNeed),
  };

  return {
    useCases,
    routes: createNeedsRoutes(useCases),
  };
}
