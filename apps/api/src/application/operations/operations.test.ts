import { beforeEach, describe, expect, test } from "bun:test";
import { PlanOperation } from "./plan-operation";
import { ListOperations } from "./list-operations";
import { AssignResource } from "./assign-resource";
import { ListAssignmentsByOperation } from "./list-assignments-by-operation";
import { InMemoryOperationRepository } from "../../infrastructure/persistence/in-memory-operation.repository";
import { InMemoryAssignmentRepository } from "../../infrastructure/persistence/in-memory-assignment.repository";

describe("PlanOperation / ListOperations", () => {
  let operations: InMemoryOperationRepository;

  beforeEach(() => {
    operations = new InMemoryOperationRepository();
  });

  test("planifica una operación PLANNED y la lista", async () => {
    const plan = new PlanOperation(operations);
    const list = new ListOperations(operations);

    const op = await plan.execute({
      name: "Rescate Petare",
      incidentId: crypto.randomUUID(),
      zone: "Petare",
    });

    expect(op.status).toBe("PLANNED");
    const all = await list.execute();
    expect(all).toHaveLength(1);
    expect(all[0]!.name).toBe("Rescate Petare");
  });
});

describe("AssignResource / ListAssignmentsByOperation", () => {
  let operations: InMemoryOperationRepository;
  let assignments: InMemoryAssignmentRepository;

  beforeEach(() => {
    operations = new InMemoryOperationRepository();
    assignments = new InMemoryAssignmentRepository();
  });

  test("asigna un recurso a una operación y lista las asignaciones", async () => {
    const op = await new PlanOperation(operations).execute({
      name: "Op A",
      incidentId: crypto.randomUUID(),
      zone: "Zona A",
    });
    const assign = new AssignResource(operations, assignments);

    const assignment = await assign.execute(op.id, {
      resourceId: crypto.randomUUID(),
      quantity: 20,
    });
    expect(assignment.quantity).toBe(20);
    expect(assignment.operationId).toBe(op.id);

    const list = await new ListAssignmentsByOperation(assignments).execute(op.id);
    expect(list).toHaveLength(1);
  });

  test("rechaza asignar a una operación inexistente", async () => {
    const assign = new AssignResource(operations, assignments);
    await expect(
      assign.execute(crypto.randomUUID(), {
        resourceId: crypto.randomUUID(),
        quantity: 5,
      }),
    ).rejects.toThrow();
  });
});
