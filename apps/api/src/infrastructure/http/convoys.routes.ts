import { Hono } from "hono";
import type { Context } from "hono";
import { addVehicleSchema, convoyStatusSchema, createConvoySchema } from "@sos/shared";
import type { AddVehicleToConvoy } from "../../application/convoys/add-vehicle-to-convoy";
import type { CancelConvoy } from "../../application/convoys/cancel-convoy";
import type { CompleteConvoy } from "../../application/convoys/complete-convoy";
import type { GetConvoy } from "../../application/convoys/get-convoy";
import type { ListConvoys } from "../../application/convoys/list-convoys";
import type { PlanConvoy } from "../../application/convoys/plan-convoy";
import type { StartConvoy } from "../../application/convoys/start-convoy";
import { ConvoyDomainError, ConvoyError } from "../../domain/convoys/errors";
import { authentication, requireRole, type AuthEnv } from "./middleware/authentication";

export interface ConvoysRoutesDeps {
  listConvoys: ListConvoys;
  getConvoy: GetConvoy;
  planConvoy: PlanConvoy;
  startConvoy: StartConvoy;
  completeConvoy: CompleteConvoy;
  cancelConvoy: CancelConvoy;
  addVehicleToConvoy: AddVehicleToConvoy;
}

const CONVOY_ERROR_STATUS: Record<string, 400 | 404 | 409> = {
  CONVOY_NOT_FOUND: 404,
  INVALID_TRANSITION: 409,
  DUPLICATE_VEHICLE: 409,
  CONVOY_NOT_PLANIFICADO: 409,
};

function mapError(c: Context, error: unknown) {
  if (error instanceof ConvoyError || error instanceof ConvoyDomainError) {
    const status = CONVOY_ERROR_STATUS[error.code] ?? 400;
    return c.json({ error: error.message, code: error.code }, status);
  }

  console.error("Error inesperado en convoys:", error);
  return c.json({ error: "Error interno" }, 500);
}

export function createConvoysRoutes(deps: ConvoysRoutesDeps): Hono<AuthEnv> {
  const router = new Hono<AuthEnv>();

  router.get("/", async (c) => {
    const status = c.req.query("status");
    const parsedStatus = status ? convoyStatusSchema.safeParse(status) : null;
    if (parsedStatus && !parsedStatus.success) {
      return c.json({ error: "Datos inválidos", details: parsedStatus.error.flatten() }, 400);
    }

    try {
      const convoys = await deps.listConvoys.execute({ status: parsedStatus?.data });
      return c.json({ convoys });
    } catch (error) {
      return mapError(c, error);
    }
  });

  router.get("/:id", async (c) => {
    try {
      const convoy = await deps.getConvoy.execute({ id: c.req.param("id") });
      return c.json({ convoy });
    } catch (error) {
      return mapError(c, error);
    }
  });

  router.post("/", authentication, requireRole("ZODI_SENDER"), async (c) => {
    const parsed = createConvoySchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) {
      return c.json({ error: "Datos inválidos", details: parsed.error.flatten() }, 400);
    }

    try {
      const convoy = await deps.planConvoy.execute(parsed.data);
      return c.json({ convoy }, 201);
    } catch (error) {
      return mapError(c, error);
    }
  });

  router.post("/:id/dispatch", authentication, requireRole("ZODI_SENDER"), async (c) => {
    try {
      const convoy = await deps.startConvoy.execute({ id: c.req.param("id") });
      return c.json({ convoy });
    } catch (error) {
      return mapError(c, error);
    }
  });

  router.post("/:id/complete", authentication, requireRole("ZODI_SENDER"), async (c) => {
    try {
      const convoy = await deps.completeConvoy.execute({ id: c.req.param("id") });
      return c.json({ convoy });
    } catch (error) {
      return mapError(c, error);
    }
  });

  router.post("/:id/cancel", authentication, requireRole("ZODI_SENDER"), async (c) => {
    try {
      const convoy = await deps.cancelConvoy.execute({ id: c.req.param("id") });
      return c.json({ convoy });
    } catch (error) {
      return mapError(c, error);
    }
  });

  router.post("/:id/vehicles", authentication, requireRole("ZODI_SENDER"), async (c) => {
    const parsed = addVehicleSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) {
      return c.json({ error: "Datos inválidos", details: parsed.error.flatten() }, 400);
    }

    try {
      const convoy = await deps.addVehicleToConvoy.execute({
        convoyId: c.req.param("id"),
        vehicleId: parsed.data.vehicleId,
      });
      return c.json({ convoy });
    } catch (error) {
      return mapError(c, error);
    }
  });

  return router;
}
