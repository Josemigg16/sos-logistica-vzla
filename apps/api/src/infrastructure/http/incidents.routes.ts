import { Hono } from "hono";
import type { Context } from "hono";
import { createIncidentSchema, updateIncidentSchema } from "@sos/shared";
import type { CreateIncident } from "../../application/incidents/create-incident";
import type { ListIncidents } from "../../application/incidents/list-incidents";
import type { UpdateIncident } from "../../application/incidents/update-incident";
import { IncidentsError } from "../../domain/incidents/errors";
import { authentication, requireRole, type AuthEnv } from "./middleware/authentication";

export interface IncidentsRoutesDeps {
  createIncident: CreateIncident;
  listIncidents: ListIncidents;
  updateIncident: UpdateIncident;
}

const ERROR_STATUS: Record<string, 400 | 404 | 409> = {
  INCIDENT_NOT_FOUND: 404,
};

function mapError(c: Context, error: unknown) {
  if (error instanceof IncidentsError) {
    const status = ERROR_STATUS[error.code] ?? 400;
    return c.json({ error: error.message, code: error.code }, status);
  }
  console.error("Error inesperado en incidents:", error);
  return c.json({ error: "Error interno" }, 500);
}

export function createIncidentsRoutes(deps: IncidentsRoutesDeps): Hono<AuthEnv> {
  const router = new Hono<AuthEnv>();

  // Público: las emergencias se ven en el mapa público, sin autenticación.
  router.get("/", async (c) => {
    try {
      return c.json({ incidents: await deps.listIncidents.execute() });
    } catch (error) {
      return mapError(c, error);
    }
  });

  router.post("/", authentication, requireRole("ADMIN", "MANAGER"), async (c) => {
    const parsed = createIncidentSchema.safeParse(
      await c.req.json().catch(() => null),
    );
    if (!parsed.success) {
      return c.json(
        { error: "Datos inválidos", details: parsed.error.flatten() },
        400,
      );
    }
    try {
      const actor = c.get("actor");
      const incident = await deps.createIncident.execute(
        parsed.data,
        actor.userId,
      );
      return c.json({ incident }, 201);
    } catch (error) {
      return mapError(c, error);
    }
  });

  router.put("/:id", authentication, requireRole("ADMIN", "MANAGER"), async (c) => {
    const parsed = updateIncidentSchema.safeParse(
      await c.req.json().catch(() => null),
    );
    if (!parsed.success) {
      return c.json(
        { error: "Datos inválidos", details: parsed.error.flatten() },
        400,
      );
    }
    try {
      const incident = await deps.updateIncident.execute(
        c.req.param("id"),
        parsed.data,
      );
      return c.json({ incident });
    } catch (error) {
      return mapError(c, error);
    }
  });

  return router;
}
