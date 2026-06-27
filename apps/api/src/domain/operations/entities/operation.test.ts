import { describe, expect, test } from "bun:test";
import { Operation } from "./operation";
import { InvalidOperationTransitionError } from "../errors";

function buildOperation() {
  return Operation.plan({
    id: "op-1",
    name: "Distribución La Guaira",
    incidentId: "inc-1",
    zone: "La Guaira",
  });
}

describe("Operation", () => {
  test("se planifica en estado PLANNED", () => {
    expect(buildOperation().status).toBe("PLANNED");
  });

  test("activate pasa de PLANNED a ACTIVE", () => {
    const op = buildOperation();
    op.activate();
    expect(op.status).toBe("ACTIVE");
  });

  test("complete pasa de ACTIVE a COMPLETED", () => {
    const op = buildOperation();
    op.activate();
    op.complete();
    expect(op.status).toBe("COMPLETED");
  });

  test("no se puede completar una operación que no está activa", () => {
    const op = buildOperation();
    expect(() => op.complete()).toThrow(InvalidOperationTransitionError);
  });

  test("no se puede activar una operación cancelada", () => {
    const op = buildOperation();
    op.cancel();
    expect(() => op.activate()).toThrow(InvalidOperationTransitionError);
  });

  test("no se puede cancelar una operación completada", () => {
    const op = buildOperation();
    op.activate();
    op.complete();
    expect(() => op.cancel()).toThrow(InvalidOperationTransitionError);
  });
});
