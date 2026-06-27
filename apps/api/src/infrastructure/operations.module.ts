import { PlanOperation } from "../application/operations/plan-operation";
import { ListOperations } from "../application/operations/list-operations";
import { AssignResource } from "../application/operations/assign-resource";
import { ListAssignmentsByOperation } from "../application/operations/list-assignments-by-operation";
import { DrizzleOperationRepository } from "./persistence/drizzle-operation.repository";
import { DrizzleAssignmentRepository } from "./persistence/drizzle-assignment.repository";
import { createOperationRoutes } from "./http/operations.routes";

/**
 * Composition root del bounded context `operations`.
 */
export function createOperationsModule() {
  const operations = new DrizzleOperationRepository();
  const assignments = new DrizzleAssignmentRepository();

  const useCases = {
    planOperation: new PlanOperation(operations),
    listOperations: new ListOperations(operations),
    assignResource: new AssignResource(operations, assignments),
    listAssignmentsByOperation: new ListAssignmentsByOperation(assignments),
  };

  return {
    useCases,
    routes: createOperationRoutes(useCases),
  };
}
