import { Hono } from "hono";
import type { Context } from "hono";
import {
  createLoteSchema,
  updateLoteSchema,
  assignVehicleSchema,
  transferLoteSchema,
} from "@sos/shared";
import type { CreateLote } from "../../application/cargo/create-lote";
import type { ListLotes } from "../../application/cargo/list-lotes";
import type { UpdateLote } from "../../application/cargo/update-lote";
import type { DeleteLote } from "../../application/cargo/delete-lote";
import type { AssignVehicle } from "../../application/cargo/assign-vehicle";
import type { TransferLote } from "../../application/cargo/transfer-lote";
import { CargoError } from "../../domain/cargo/errors";
import { authentication, requireRole, type AuthEnv } from "./middleware/authentication";

export interface CargoRoutesDeps {
  createLote: CreateLote;
  listLotes: ListLotes;
  updateLote: UpdateLote;
  deleteLote: DeleteLote;
  assignVehicle: AssignVehicle;
  transferLote: TransferLote;
}

const CARGO_ERROR_STATUS: Record<string, 400 | 403 | 404 | 409> = {
  LOTE_NOT_FOUND: 404,
  HUB_NOT_FOUND: 404,
  VEHICLE_HAS_NO_DRIVER: 400,
  VEHICLE_CAPACITY_EXCEEDED: 409,
  LOTE_NOT_IN_TRANSIT: 400,
  LOTE_ALREADY_DELIVERED: 400,
};

function mapError(c: Context, error: unknown) {
  if (error instanceof CargoError) {
    const status = CARGO_ERROR_STATUS[error.code] ?? 400;
    return c.json({ error: error.message, code: error.code }, status);
  }
  console.error("Error inesperado en cargo:", error);
  return c.json({ error: "Error interno" }, 500);
}

export function createCargoRoutes(deps: CargoRoutesDeps): Hono<AuthEnv> {
  const router = new Hono<AuthEnv>();

  // --- Lotes ---

  router.get("/lotes", authentication, async (c) => {
    const hubId = c.req.query("hubId") ?? undefined;
    try {
      const items = await deps.listLotes.execute(hubId);
      return c.json({ lotes: items });
    } catch (error) {
      return mapError(c, error);
    }
  });

  router.post("/lotes", authentication, requireRole("ADMIN", "MANAGER", "HUB_COORDINATOR"), async (c) => {
    const parsed = createLoteSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) {
      return c.json({ error: "Datos inválidos", details: parsed.error.flatten() }, 400);
    }
    const actor = c.get("actor");
    try {
      const lote = await deps.createLote.execute(parsed.data, actor.userId);
      return c.json({ lote }, 201);
    } catch (error) {
      return mapError(c, error);
    }
  });

  router.put("/lotes/:id", authentication, requireRole("ADMIN", "MANAGER", "HUB_COORDINATOR"), async (c) => {
    const id = c.req.param("id");
    const parsed = updateLoteSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) {
      return c.json({ error: "Datos inválidos", details: parsed.error.flatten() }, 400);
    }
    try {
      const lote = await deps.updateLote.execute(id, parsed.data);
      return c.json({ lote });
    } catch (error) {
      return mapError(c, error);
    }
  });

  router.delete("/lotes/:id", authentication, requireRole("ADMIN", "MANAGER"), async (c) => {
    const id = c.req.param("id");
    try {
      await deps.deleteLote.execute(id);
      return c.json({ ok: true });
    } catch (error) {
      return mapError(c, error);
    }
  });

  // Asignar vehículo a un lote (pone el lote EN_TRANSITO).
  // HUB_COORDINATOR arma el lote, pero la decisión logística de qué vehículo
  // lo transporta es del operador superior (admin/manager/zodi_sender).
  router.post("/lotes/:id/assign", authentication, requireRole("ADMIN", "MANAGER", "ZODI_SENDER"), async (c) => {
    const id = c.req.param("id");
    const parsed = assignVehicleSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) {
      return c.json({ error: "Datos inválidos", details: parsed.error.flatten() }, 400);
    }
    try {
      const lote = await deps.assignVehicle.execute(id, parsed.data);
      return c.json({ lote });
    } catch (error) {
      return mapError(c, error);
    }
  });

  // Traspasar lote a otro vehículo
  router.post("/lotes/:id/transfer", authentication, requireRole("ADMIN", "MANAGER"), async (c) => {
    const id = c.req.param("id");
    const parsed = transferLoteSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) {
      return c.json({ error: "Datos inválidos", details: parsed.error.flatten() }, 400);
    }
    const actor = c.get("actor");
    try {
      const lote = await deps.transferLote.execute(id, parsed.data, actor.userId);
      return c.json({ lote });
    } catch (error) {
      return mapError(c, error);
    }
  });

  return router;
}
