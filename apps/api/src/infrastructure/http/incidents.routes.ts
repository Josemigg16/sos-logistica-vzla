import { Hono } from "hono";
import type { Context } from "hono";
import { createIncidentSchema } from "@sos/shared";
import type { ReportIncident } from "../../application/incidents/report-incident";
import type { ListIncidents } from "../../application/incidents/list-incidents";
import { IncidentError } from "../../domain/incidents/errors";
import { authentication, type AuthEnv } from "./middleware/authentication";

export interface IncidentRoutesDeps {
  reportIncident: ReportIncident;
  listIncidents: ListIncidents;
}

const ERROR_STATUS: Record<string, 404 | 409> = {
  INCIDENT_NOT_FOUND: 404,
  INCIDENT_ALREADY_CLOSED: 409,
};

function mapError(c: Context, error: unknown) {
  if (error instanceof IncidentError) {
    return c.json(
      { error: error.message, code: error.code },
      ERROR_STATUS[error.code] ?? 400,
    );
  }
  console.error("Error inesperado en incidents:", error);
  return c.json({ error: "Error interno" }, 500);
}

export function createIncidentRoutes(deps: IncidentRoutesDeps): Hono<AuthEnv> {
  const router = new Hono<AuthEnv>();

  // Listado para el panel de coordinación. Requiere sesión.
  router.get("/", authentication, async (c) => {
    try {
      return c.json({ incidents: await deps.listIncidents.execute() });
    } catch (error) {
      return mapError(c, error);
    }
  });

  // Reporte de un incidente. `reportedById` viene del actor autenticado.
  router.post("/", authentication, async (c) => {
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
      const incident = await deps.reportIncident.execute({
        ...parsed.data,
        reportedById: c.get("actor").userId,
      });
      return c.json({ incident }, 201);
    } catch (error) {
      return mapError(c, error);
    }
  });

  return router;
}
