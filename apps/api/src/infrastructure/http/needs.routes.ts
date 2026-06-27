import { Hono } from "hono";
import type { Context } from "hono";
import type { CreateNeed } from "../../application/needs/create-need";
import type { ListNeeds } from "../../application/needs/list-needs";
import type { UpdateNeed } from "../../application/needs/update-need";
import type { DeleteNeed } from "../../application/needs/delete-need";
import { NeedNotFoundError } from "../../domain/resources/errors";
import {
  authentication,
  requireRole,
  type AuthEnv,
} from "./middleware/authentication";

export interface NeedsRoutesDeps {
  createNeed: CreateNeed;
  listNeeds: ListNeeds;
  updateNeed: UpdateNeed;
  deleteNeed: DeleteNeed;
}

/**
 * ACL (Anti-Corruption Layer): traduce el contrato HTTP español del frontend
 * (nombre/categoria/unidad/meta/recibido/prioridad/descripcion/fechaNecesidad)
 * al modelo de dominio en inglés y viceversa.
 *
 * Registra AMBOS alias /needs y /necesidades para mantener el contrato legacy
 * sin modificar index.ts ni el cliente del frontend.
 */
export function createNeedsRoutes(deps: NeedsRoutesDeps): Hono<AuthEnv> {
  const router = new Hono<AuthEnv>();

  // ── GET ─────────────────────────────────────────────────────────────────────

  const getHandler = async (c: Context) => {
    try {
      const hubId = c.req.query("hubId");
      const rows = await deps.listNeeds.execute(hubId || undefined);
      return c.json(rows);
    } catch (error) {
      console.error("Error al obtener necesidades:", error);
      return c.json({ error: "Error al obtener necesidades" }, 500);
    }
  };

  router.get("/needs", getHandler);
  router.get("/necesidades", getHandler);

  // ── POST — requiere ADMIN o ZODI_DESTINATION ─────────────────────────────────

  const postHandler = async (c: Context) => {
    try {
      const body = await c.req.json();

      if (!body.hubId || !body.nombre || !body.categoria || !body.meta || !body.prioridad) {
        return c.json({ error: "Faltan campos requeridos" }, 400);
      }

      const row = await deps.createNeed.execute({
        hubId: body.hubId,
        nombre: body.nombre,
        categoria: body.categoria,
        meta: body.meta,
        prioridad: body.prioridad,
        recibido: body.recibido,
        descripcion: body.descripcion,
        fechaNecesidad: body.fechaNecesidad ?? null,
      });

      return c.json(
        {
          id: row.id,
          hubId: row.hubId,
          productId: row.productId,
          nombre: row.nombre,
          categoria: row.categoria,
          unidad: row.unidad,
          meta: row.meta,
          recibido: row.recibido,
          prioridad: row.prioridad,
          descripcion: row.descripcion,
          fechaNecesidad: row.fechaNecesidad,
          ultimaActualizacion: new Date().toISOString(),
        },
        201,
      );
    } catch (error) {
      console.error("Error al crear necesidad:", error);
      return c.json({ error: "Error interno en el servidor" }, 500);
    }
  };

  router.post("/needs", authentication, requireRole("ADMIN", "ZODI_DESTINATION"), postHandler);
  router.post("/necesidades", authentication, requireRole("ADMIN", "ZODI_DESTINATION"), postHandler);

  // ── PUT — requiere ADMIN o ZODI_DESTINATION ──────────────────────────────────

  const putHandler = async (c: Context) => {
    try {
      const id = c.req.param("id") as string;
      const body = await c.req.json();

      const row = await deps.updateNeed.execute({
        id,
        meta: body.meta !== undefined ? Number(body.meta) : undefined,
        recibido: body.recibido !== undefined ? Number(body.recibido) : undefined,
        prioridad: body.prioridad,
        descripcion: body.descripcion,
        fechaNecesidad: body.fechaNecesidad || undefined,
      });

      return c.json({
        id: row.id,
        hubId: row.hubId,
        hubName: row.hubName,
        productId: row.productId,
        nombre: row.nombre,
        categoria: row.categoria,
        unidad: row.unidad,
        meta: row.meta,
        recibido: row.recibido,
        prioridad: row.prioridad,
        descripcion: row.descripcion,
        fechaNecesidad: row.fechaNecesidad,
      });
    } catch (error) {
      if (error instanceof NeedNotFoundError) {
        return c.json({ error: "Necesidad no encontrada" }, 404);
      }
      console.error("Error al actualizar necesidad:", error);
      return c.json({ error: "Error interno en el servidor" }, 500);
    }
  };

  router.put("/needs/:id", authentication, requireRole("ADMIN", "ZODI_DESTINATION"), putHandler);
  router.put("/necesidades/:id", authentication, requireRole("ADMIN", "ZODI_DESTINATION"), putHandler);

  // ── DELETE — requiere ADMIN o ZODI_DESTINATION ───────────────────────────────

  const deleteHandler = async (c: Context) => {
    try {
      const id = c.req.param("id") as string;
      await deps.deleteNeed.execute(id);
      return c.json({ ok: true });
    } catch (error) {
      if (error instanceof NeedNotFoundError) {
        return c.json({ error: "Necesidad no encontrada" }, 404);
      }
      console.error("Error al eliminar necesidad:", error);
      return c.json({ error: "Error interno en el servidor" }, 500);
    }
  };

  router.delete("/needs/:id", authentication, requireRole("ADMIN", "ZODI_DESTINATION"), deleteHandler);
  router.delete("/necesidades/:id", authentication, requireRole("ADMIN", "ZODI_DESTINATION"), deleteHandler);

  return router;
}
