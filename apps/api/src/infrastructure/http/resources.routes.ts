import { Hono } from "hono";
import type { Context } from "hono";
import { createHubSchema, stockResourceSchema } from "@sos/shared";
import type { RegisterHub } from "../../application/resources/register-hub";
import type { ListHubs } from "../../application/resources/list-hubs";
import type { StockResource } from "../../application/resources/stock-resource";
import type { ListResourcesByHub } from "../../application/resources/list-resources-by-hub";
import { ResourceError } from "../../domain/resources/errors";
import { authentication, type AuthEnv } from "./middleware/authentication";

export interface ResourceRoutesDeps {
  registerHub: RegisterHub;
  listHubs: ListHubs;
  stockResource: StockResource;
  listResourcesByHub: ListResourcesByHub;
}

const ERROR_STATUS: Record<string, 404 | 409> = {
  HUB_NOT_FOUND: 404,
  INSUFFICIENT_STOCK: 409,
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

  router.post("/resources", authentication, async (c) => {
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

  return router;
}
