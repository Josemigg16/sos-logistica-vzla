import { Hono } from "hono";
import type { Context } from "hono";
import {
  createHubSchema,
  registerInventoryBatchSchema,
  stockResourceSchema,
} from "@sos/shared";
import type { RegisterHub } from "../../application/resources/register-hub";
import type { ListHubs } from "../../application/resources/list-hubs";
import type { GetHubByCoordinator } from "../../application/resources/get-hub-by-coordinator";
import type { StockResource } from "../../application/resources/stock-resource";
import type { ListResourcesByHub } from "../../application/resources/list-resources-by-hub";
import type { RegisterInventoryBatch } from "../../application/resources/register-inventory-batch";
import type { ListInventoryBatchesByHub } from "../../application/resources/list-inventory-batches-by-hub";
import type { GetHubStockSummary } from "../../application/resources/get-hub-stock-summary";
import type { DeleteInventoryBatch } from "../../application/resources/delete-inventory-batch";
import { ResourceError } from "../../domain/resources/errors";
import { authentication, requireRole, type AuthEnv } from "./middleware/authentication";

export interface ResourceRoutesDeps {
  registerHub: RegisterHub;
  listHubs: ListHubs;
  getHubByCoordinator: GetHubByCoordinator;
  stockResource: StockResource;
  listResourcesByHub: ListResourcesByHub;
  registerInventoryBatch: RegisterInventoryBatch;
  listInventoryBatchesByHub: ListInventoryBatchesByHub;
  getHubStockSummary: GetHubStockSummary;
  deleteInventoryBatch: DeleteInventoryBatch;
}

const ERROR_STATUS: Record<string, 400 | 404 | 409> = {
  HUB_NOT_FOUND: 404,
  PRODUCT_NOT_FOUND: 404,
  INSUFFICIENT_STOCK: 409,
  INVENTORY_BATCH_NOT_FOUND: 404,
  INVALID_BATCH_QUANTITY: 400,
};

function mapError(c: Context, error: unknown) {
  if (error instanceof ResourceError) {
    return c.json(
      { error: error.message, code: error.code },
      ERROR_STATUS[error.code] ?? 400,
    );
  }
  console.error("Error inesperado en resources:", error);
  return c.json({ error: "Error interno" }, 500);
}

export function createResourceRoutes(deps: ResourceRoutesDeps): Hono<AuthEnv> {
  const router = new Hono<AuthEnv>();

  router.get("/hubs", authentication, async (c) => {
    try {
      return c.json({ hubs: await deps.listHubs.execute() });
    } catch (error) {
      return mapError(c, error);
    }
  });

  // Centro de acopio del coordinador autenticado (o null si aún no lo registró).
  router.get("/my-hub", authentication, async (c) => {
    try {
      const actor = c.get("actor");
      const hub = await deps.getHubByCoordinator.execute(actor.userId);
      return c.json({ hub });
    } catch (error) {
      return mapError(c, error);
    }
  });

  // Auto-registro del centro de acopio del coordinador: queda asociado a él.
  router.post("/my-hub", authentication, async (c) => {
    const actor = c.get("actor");
    const parsed = createHubSchema.safeParse(
      await c.req.json().catch(() => null),
    );
    if (!parsed.success) {
      return c.json(
        { error: "Datos inválidos", details: parsed.error.flatten() },
        400,
      );
    }
    try {
      const existing = await deps.getHubByCoordinator.execute(actor.userId);
      if (existing) {
        return c.json(
          { error: "Ya tienes un centro de acopio registrado", code: "HUB_ALREADY_EXISTS" },
          409,
        );
      }
      const hub = await deps.registerHub.execute({
        ...parsed.data,
        coordinatorId: actor.userId,
      });
      return c.json({ hub }, 201);
    } catch (error) {
      return mapError(c, error);
    }
  });

  router.post("/hubs", authentication, async (c) => {
    const parsed = createHubSchema.safeParse(
      await c.req.json().catch(() => null),
    );
    if (!parsed.success) {
      return c.json(
        { error: "Datos inválidos", details: parsed.error.flatten() },
        400,
      );
    }
    try {
      return c.json({ hub: await deps.registerHub.execute(parsed.data) }, 201);
    } catch (error) {
      return mapError(c, error);
    }
  });

  router.get("/hubs/:hubId/resources", authentication, async (c) => {
    try {
      const resources = await deps.listResourcesByHub.execute(
        c.req.param("hubId"),
      );
      return c.json({ resources });
    } catch (error) {
      return mapError(c, error);
    }
  });

  router.post("/", authentication, async (c) => {
    const parsed = stockResourceSchema.safeParse(
      await c.req.json().catch(() => null),
    );
    if (!parsed.success) {
      return c.json(
        { error: "Datos inválidos", details: parsed.error.flatten() },
        400,
      );
    }
    try {
      const resource = await deps.stockResource.execute(parsed.data);
      return c.json({ resource }, 201);
    } catch (error) {
      return mapError(c, error);
    }
  });

  router.get("/hubs/:hubId/batches", authentication, async (c) => {
    try {
      const batches = await deps.listInventoryBatchesByHub.execute(
        c.req.param("hubId"),
      );
      return c.json({ batches });
    } catch (error) {
      return mapError(c, error);
    }
  });

  router.get("/hubs/:hubId/stock", authentication, async (c) => {
    try {
      const stock = await deps.getHubStockSummary.execute(c.req.param("hubId"));
      return c.json({ stock });
    } catch (error) {
      return mapError(c, error);
    }
  });

  router.post(
    "/hubs/:hubId/batches",
    authentication,
    requireRole("ADMIN", "HUB_COORDINATOR", "ZODI_SENDER", "ZODI_DESTINATION"),
    async (c) => {
      const body = await c.req.json().catch(() => null);
      const parsed = registerInventoryBatchSchema.safeParse({
        ...(body ?? {}),
        hubId: c.req.param("hubId"),
      });
      if (!parsed.success) {
        return c.json(
          { error: "Datos inválidos", details: parsed.error.flatten() },
          400,
        );
      }
      try {
        const batch = await deps.registerInventoryBatch.execute(parsed.data);
        return c.json({ batch }, 201);
      } catch (error) {
        return mapError(c, error);
      }
    },
  );

  router.delete(
    "/batches/:id",
    authentication,
    requireRole("ADMIN", "HUB_COORDINATOR", "ZODI_SENDER", "ZODI_DESTINATION"),
    async (c) => {
      try {
        await deps.deleteInventoryBatch.execute(c.req.param("id"));
        return c.json({ ok: true });
      } catch (error) {
        return mapError(c, error);
      }
    },
  );

  return router;
}
