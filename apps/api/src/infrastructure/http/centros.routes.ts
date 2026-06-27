import { Hono } from "hono";
import type { Context } from "hono";
import { centroSchema, type Centro, type HubType } from "@sos/shared";
import type { ListHubs } from "../../application/resources/list-hubs";
import type { ListResourcesByHub } from "../../application/resources/list-resources-by-hub";
import type { UpsertHub } from "../../application/resources/upsert-hub";
import type { ReplaceHubInventory } from "../../application/resources/replace-hub-inventory";
import type { DeleteHub } from "../../application/resources/delete-hub";
import { ResourceError } from "../../domain/resources/errors";

/**
 * Anti-Corruption Layer: translates the legacy Spanish `Centro` contract
 * from the frontend into the English `Hub` domain — and back.
 *
 * Domain and use cases stay pure English.
 * Only this file speaks the `Centro` JSON shape.
 */

// ---------- type mapping (ACL) ----------

const HUB_TYPE_TO_TIPO: Record<HubType, Centro["tipo"]> = {
  COLLECTION: "acopio",
  DISPATCH: "salida",
  DESTINATION: "destino",
};

const TIPO_TO_HUB_TYPE: Record<Centro["tipo"], HubType> = {
  acopio: "COLLECTION",
  salida: "DISPATCH",
  destino: "DESTINATION",
};

// ---------- deps ----------

export interface CentrosRoutesDeps {
  listHubs: ListHubs;
  listResourcesByHub: ListResourcesByHub;
  upsertHub: UpsertHub;
  replaceHubInventory: ReplaceHubInventory;
  deleteHub: DeleteHub;
}

// ---------- error mapper ----------

function mapError(c: Context, error: unknown) {
  if (error instanceof ResourceError) {
    if (error.code === "HUB_NOT_FOUND") {
      return c.json({ error: error.message }, 404);
    }
    return c.json({ error: error.message, code: error.code }, 400);
  }
  console.error("Error inesperado en /centros:", error);
  return c.json({ error: "Error interno" }, 500);
}

// ---------- helpers ----------

async function buildCentroFromHub(
  hub: { id: string; name: string; address: string; contact: string; type: HubType; longitude: number; latitude: number },
  listResourcesByHub: ListResourcesByHub,
): Promise<Centro> {
  const resources = await listResourcesByHub.execute(hub.id);
  const inventario: Record<string, number> = {};
  for (const r of resources) {
    inventario[r.category] = r.quantity;
  }
  return {
    id: hub.id,
    nombre: hub.name,
    direccion: hub.address,
    contacto: hub.contact,
    responsable: "Coordinador de Centro",
    coordenadas: [hub.longitude, hub.latitude],
    tipo: HUB_TYPE_TO_TIPO[hub.type],
    inventario,
  };
}

// ---------- factory ----------

export function createCentrosRoutes(deps: CentrosRoutesDeps): Hono {
  const router = new Hono();

  /**
   * GET /centros
   * Returns all hubs as Centro[]. No auth required (public map endpoint).
   */
  router.get("/", async (c) => {
    try {
      const hubs = await deps.listHubs.execute();
      const centros = await Promise.all(
        hubs.map((hub) => buildCentroFromHub(hub, deps.listResourcesByHub)),
      );
      return c.json(centros);
    } catch (error) {
      return mapError(c, error);
    }
  });

  /**
   * POST /centros
   * Upsert hub + replace inventory atomically.
   * Returns { success: true, centro }.
   * Bug fix: legacy DELETE used centros.json; this endpoint now uses Postgres.
   */
  router.post("/", async (c) => {
    const parsed = centroSchema.safeParse(
      await c.req.json().catch(() => null),
    );
    if (!parsed.success) {
      return c.json(
        { error: "Datos inválidos", details: parsed.error.format() },
        400,
      );
    }

    const centro = parsed.data;

    try {
      const savedHub = await deps.upsertHub.execute({
        id: centro.id,
        name: centro.nombre,
        address: centro.direccion,
        contact: centro.contacto,
        type: TIPO_TO_HUB_TYPE[centro.tipo],
        latitude: centro.coordenadas[1],
        longitude: centro.coordenadas[0],
      });

      await deps.replaceHubInventory.execute({
        hubId: centro.id,
        inventory: centro.inventario,
      });

      // Rebuild response from stored state (mirrors legacy { success, centro } contract)
      const responseCentro = await buildCentroFromHub(savedHub, deps.listResourcesByHub);

      // Preserve optional metadata / verificacion if the client sent them
      if (centro.metadata) (responseCentro as typeof centro).metadata = centro.metadata;
      if (centro.verificacion) (responseCentro as typeof centro).verificacion = centro.verificacion;

      return c.json({ success: true, centro: responseCentro });
    } catch (error) {
      return mapError(c, error);
    }
  });

  /**
   * DELETE /centros/:id
   * Fixes the bug in the legacy handler that deleted from centros.json
   * while GET/POST used Postgres. Now deletes from Postgres (+ cascade).
   */
  router.delete("/:id", async (c) => {
    const id = c.req.param("id");
    try {
      await deps.deleteHub.execute(id);
      return c.json({ success: true });
    } catch (error) {
      return mapError(c, error);
    }
  });

  return router;
}
