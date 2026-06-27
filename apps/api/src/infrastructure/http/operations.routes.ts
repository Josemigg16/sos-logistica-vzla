import { Hono } from "hono";
import type { Context } from "hono";
import { createAssignmentSchema, createOperationSchema } from "@sos/shared";
import type { PlanOperation } from "../../application/operations/plan-operation";
import type { ListOperations } from "../../application/operations/list-operations";
import type { AssignResource } from "../../application/operations/assign-resource";
import type { ListAssignmentsByOperation } from "../../application/operations/list-assignments-by-operation";
import { OperationError } from "../../domain/operations/errors";
import { authentication, type AuthEnv } from "./middleware/authentication";

export interface OperationRoutesDeps {
  planOperation: PlanOperation;
  listOperations: ListOperations;
  assignResource: AssignResource;
  listAssignmentsByOperation: ListAssignmentsByOperation;
}

const ERROR_STATUS: Record<string, 404 | 409> = {
  OPERATION_NOT_FOUND: 404,
  INVALID_OPERATION_TRANSITION: 409,
};

function mapError(c: Context, error: unknown) {
  if (error instanceof OperationError) {
    return c.json(
      { error: error.message, code: error.code },
      ERROR_STATUS[error.code] ?? 400,
    );
  }
  console.error("Error inesperado en operations:", error);
  return c.json({ error: "Error interno" }, 500);
}

export function createOperationRoutes(deps: OperationRoutesDeps): Hono<AuthEnv> {
  const router = new Hono<AuthEnv>();

  router.get("/", authentication, async (c) => {
    try {
      return c.json({ operations: await deps.listOperations.execute() });
    } catch (error) {
      return mapError(c, error);
    }
  });

  router.post("/", authentication, async (c) => {
    const parsed = createOperationSchema.safeParse(
      await c.req.json().catch(() => null),
    );
    if (!parsed.success) {
      return c.json(
        { error: "Datos inválidos", details: parsed.error.flatten() },
        400,
      );
    }
    try {
      const operation = await deps.planOperation.execute(parsed.data);
      return c.json({ operation }, 201);
    } catch (error) {
      return mapError(c, error);
    }
  });

  router.get("/:operationId/assignments", authentication, async (c) => {
    try {
      const assignments = await deps.listAssignmentsByOperation.execute(
        c.req.param("operationId"),
      );
      return c.json({ assignments });
    } catch (error) {
      return mapError(c, error);
    }
  });

  router.post("/:operationId/assignments", authentication, async (c) => {
    const parsed = createAssignmentSchema.safeParse(
      await c.req.json().catch(() => null),
    );
    if (!parsed.success) {
      return c.json(
        { error: "Datos inválidos", details: parsed.error.flatten() },
        400,
      );
    }
    try {
      const assignment = await deps.assignResource.execute(
        c.req.param("operationId"),
        parsed.data,
      );
      return c.json({ assignment }, 201);
    } catch (error) {
      return mapError(c, error);
    }
  });

  return router;
}
