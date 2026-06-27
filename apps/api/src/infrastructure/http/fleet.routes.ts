import { Hono } from "hono";
import type { Context } from "hono";
import {
  createVehicleTypeSchema,
  updateVehicleTypeSchema,
  createVehicleSchema,
  updateVehicleSchema,
  createDriverSchema,
  updateDriverSchema,
} from "@sos/shared";
import type { CreateVehicleType } from "../../application/fleet/create-vehicle-type";
import type { ListVehicleTypes } from "../../application/fleet/list-vehicle-types";
import type { UpdateVehicleType } from "../../application/fleet/update-vehicle-type";
import type { DeleteVehicleType } from "../../application/fleet/delete-vehicle-type";
import type { CreateVehicle } from "../../application/fleet/create-vehicle";
import type { ListVehicles } from "../../application/fleet/list-vehicles";
import type { UpdateVehicle } from "../../application/fleet/update-vehicle";
import type { DeleteVehicle } from "../../application/fleet/delete-vehicle";
import type { CreateDriver } from "../../application/fleet/create-driver";
import type { ListDrivers } from "../../application/fleet/list-drivers";
import type { UpdateDriver } from "../../application/fleet/update-driver";
import type { DeleteDriver } from "../../application/fleet/delete-driver";
import { FleetError } from "../../domain/fleet/errors";
import { IdentityError } from "../../domain/identity/errors";
import { authentication, requireRole, type AuthEnv } from "./middleware/authentication";

export interface FleetRoutesDeps {
  createVehicleType: CreateVehicleType;
  listVehicleTypes: ListVehicleTypes;
  updateVehicleType: UpdateVehicleType;
  deleteVehicleType: DeleteVehicleType;
  createVehicle: CreateVehicle;
  listVehicles: ListVehicles;
  updateVehicle: UpdateVehicle;
  deleteVehicle: DeleteVehicle;
  createDriver: CreateDriver;
  listDrivers: ListDrivers;
  updateDriver: UpdateDriver;
  deleteDriver: DeleteDriver;
}

const FLEET_ERROR_STATUS: Record<string, 400 | 404 | 409> = {
  VEHICLE_TYPE_NOT_FOUND: 404,
  VEHICLE_NOT_FOUND: 404,
  DRIVER_NOT_FOUND: 404,
  PLACA_TAKEN: 409,
  USERNAME_TAKEN: 409,
};

function mapError(c: Context, error: unknown) {
  if (error instanceof FleetError || error instanceof IdentityError) {
    const status = FLEET_ERROR_STATUS[(error as any).code] ?? 400;
    return c.json({ error: error.message, code: (error as any).code }, status);
  }
  console.error("Error inesperado en fleet:", error);
  return c.json({ error: "Error interno" }, 500);
}

export function createFleetRoutes(deps: FleetRoutesDeps): Hono<AuthEnv> {
  const router = new Hono<AuthEnv>();

  // ── Tipos de Vehículo ──────────────────────────────────────────────────────
  router.get("/vehicle-types", authentication, async (c) => {
    try {
      return c.json({ vehicleTypes: await deps.listVehicleTypes.execute() });
    } catch (error) { return mapError(c, error); }
  });

  router.post("/vehicle-types", authentication, requireRole("ADMIN", "MANAGER"), async (c) => {
    const parsed = createVehicleTypeSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ error: "Datos inválidos", details: parsed.error.flatten() }, 400);
    try {
      return c.json({ vehicleType: await deps.createVehicleType.execute(parsed.data) }, 201);
    } catch (error) { return mapError(c, error); }
  });

  router.put("/vehicle-types/:id", authentication, requireRole("ADMIN", "MANAGER"), async (c) => {
    const parsed = updateVehicleTypeSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ error: "Datos inválidos", details: parsed.error.flatten() }, 400);
    try {
      return c.json({ vehicleType: await deps.updateVehicleType.execute(c.req.param("id"), parsed.data) });
    } catch (error) { return mapError(c, error); }
  });

  router.delete("/vehicle-types/:id", authentication, requireRole("ADMIN", "MANAGER"), async (c) => {
    try {
      await deps.deleteVehicleType.execute(c.req.param("id"));
      return c.json({ ok: true });
    } catch (error) { return mapError(c, error); }
  });

  // ── Vehículos ──────────────────────────────────────────────────────────────
  router.get("/vehicles", authentication, async (c) => {
    try {
      return c.json({ vehicles: await deps.listVehicles.execute() });
    } catch (error) { return mapError(c, error); }
  });

  router.post("/vehicles", authentication, requireRole("ADMIN", "MANAGER"), async (c) => {
    const parsed = createVehicleSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ error: "Datos inválidos", details: parsed.error.flatten() }, 400);
    try {
      return c.json({ vehicle: await deps.createVehicle.execute(parsed.data) }, 201);
    } catch (error) { return mapError(c, error); }
  });

  router.put("/vehicles/:id", authentication, requireRole("ADMIN", "MANAGER"), async (c) => {
    const parsed = updateVehicleSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ error: "Datos inválidos", details: parsed.error.flatten() }, 400);
    try {
      return c.json({ vehicle: await deps.updateVehicle.execute(c.req.param("id"), parsed.data) });
    } catch (error) { return mapError(c, error); }
  });

  router.delete("/vehicles/:id", authentication, requireRole("ADMIN", "MANAGER"), async (c) => {
    try {
      await deps.deleteVehicle.execute(c.req.param("id"));
      return c.json({ ok: true });
    } catch (error) { return mapError(c, error); }
  });

  // ── Choferes ───────────────────────────────────────────────────────────────
  router.get("/drivers", authentication, async (c) => {
    try {
      return c.json({ drivers: await deps.listDrivers.execute() });
    } catch (error) { return mapError(c, error); }
  });

  router.post("/drivers", authentication, requireRole("ADMIN", "MANAGER"), async (c) => {
    const parsed = createDriverSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ error: "Datos inválidos", details: parsed.error.flatten() }, 400);
    try {
      return c.json({ driver: await deps.createDriver.execute(parsed.data) }, 201);
    } catch (error) { return mapError(c, error); }
  });

  router.put("/drivers/:id", authentication, requireRole("ADMIN", "MANAGER"), async (c) => {
    const parsed = updateDriverSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ error: "Datos inválidos", details: parsed.error.flatten() }, 400);
    try {
      return c.json({ driver: await deps.updateDriver.execute(c.req.param("id"), parsed.data) });
    } catch (error) { return mapError(c, error); }
  });

  router.delete("/drivers/:id", authentication, requireRole("ADMIN", "MANAGER"), async (c) => {
    try {
      await deps.deleteDriver.execute(c.req.param("id"));
      return c.json({ ok: true });
    } catch (error) { return mapError(c, error); }
  });

  return router;
}
