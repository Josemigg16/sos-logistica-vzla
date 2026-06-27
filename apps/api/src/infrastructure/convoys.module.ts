import { AddVehicleToConvoy } from "../application/convoys/add-vehicle-to-convoy";
import { CancelConvoy } from "../application/convoys/cancel-convoy";
import { CompleteConvoy } from "../application/convoys/complete-convoy";
import { GetConvoy } from "../application/convoys/get-convoy";
import { ListConvoys } from "../application/convoys/list-convoys";
import { PlanConvoy } from "../application/convoys/plan-convoy";
import { StartConvoy } from "../application/convoys/start-convoy";
import { createConvoysRoutes } from "./http/convoys.routes";
import { DrizzleConvoyRepository } from "./persistence/drizzle-convoy.repository";
import { DrizzleHubRepository } from "./persistence/drizzle-hub.repository";
import { DrizzleUserRepository } from "./persistence/drizzle-user.repository";

/**
 * Composition root del bounded context `convoys`.
 */
export function createConvoysModule() {
  const convoys = new DrizzleConvoyRepository();
  const hubs = new DrizzleHubRepository();
  const users = new DrizzleUserRepository();

  const useCases = {
    listConvoys: new ListConvoys(convoys),
    getConvoy: new GetConvoy(convoys),
    planConvoy: new PlanConvoy(convoys, hubs, users),
    startConvoy: new StartConvoy(convoys),
    completeConvoy: new CompleteConvoy(convoys),
    cancelConvoy: new CancelConvoy(convoys),
    addVehicleToConvoy: new AddVehicleToConvoy(convoys),
  };

  return {
    useCases,
    routes: createConvoysRoutes(useCases),
  };
}
