import { AddVehicleToConvoy } from "../application/convoys/add-vehicle-to-convoy";
import { CancelConvoy } from "../application/convoys/cancel-convoy";
import { CompleteConvoy } from "../application/convoys/complete-convoy";
import { ConfirmConvoyArrival } from "../application/convoys/confirm-convoy-arrival";
import { GetConvoy } from "../application/convoys/get-convoy";
import { ListConvoys } from "../application/convoys/list-convoys";
import { ListEscorts } from "../application/convoys/list-escorts";
import { PlanConvoy } from "../application/convoys/plan-convoy";
import { StartConvoy } from "../application/convoys/start-convoy";
import { createConvoysRoutes } from "./http/convoys.routes";
import { DrizzleConvoyRepository } from "./persistence/drizzle-convoy.repository";
import { DrizzleHubRepository } from "./persistence/drizzle-hub.repository";
import { DrizzleUserRepository } from "./persistence/drizzle-user.repository";
import { DrizzleLoteRepository } from "./persistence/drizzle-lote.repository";

/**
 * Composition root del bounded context `convoys`.
 */
export function createConvoysModule() {
  const convoys = new DrizzleConvoyRepository();
  const hubs = new DrizzleHubRepository();
  const users = new DrizzleUserRepository();
  const lotes = new DrizzleLoteRepository();

  const useCases = {
    listConvoys: new ListConvoys(convoys),
    listEscorts: new ListEscorts(users),
    getConvoy: new GetConvoy(convoys),
    planConvoy: new PlanConvoy(convoys, hubs, users),
    startConvoy: new StartConvoy(convoys, lotes),
    completeConvoy: new CompleteConvoy(convoys),
    confirmConvoyArrival: new ConfirmConvoyArrival(convoys, lotes),
    cancelConvoy: new CancelConvoy(convoys),
    addVehicleToConvoy: new AddVehicleToConvoy(convoys),
  };

  return {
    useCases,
    routes: createConvoysRoutes(useCases),
  };
}
