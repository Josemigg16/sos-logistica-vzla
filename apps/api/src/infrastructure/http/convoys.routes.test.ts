import { beforeEach, describe, expect, test } from "bun:test";
import { Hono } from "hono";
import { sign } from "hono/jwt";
import type { RoleName } from "@sos/shared";
import { AddVehicleToConvoy } from "../../application/convoys/add-vehicle-to-convoy";
import { CancelConvoy } from "../../application/convoys/cancel-convoy";
import { CompleteConvoy } from "../../application/convoys/complete-convoy";
import { GetConvoy } from "../../application/convoys/get-convoy";
import { ListConvoys } from "../../application/convoys/list-convoys";
import { PlanConvoy } from "../../application/convoys/plan-convoy";
import { StartConvoy } from "../../application/convoys/start-convoy";
import { config } from "../../config";
import { Convoy } from "../../domain/convoys/entities/convoy";
import { User } from "../../domain/identity/entities/user";
import { Credential } from "../../domain/identity/value-objects/credential";
import { Role } from "../../domain/identity/value-objects/role";
import { Hub } from "../../domain/resources/entities/hub";
import { InMemoryConvoyRepository } from "../persistence/in-memory-convoy.repository";
import { InMemoryHubRepository } from "../persistence/in-memory-hub.repository";
import { InMemoryUserRepository } from "../persistence/in-memory-user.repository";
import { createConvoysRoutes } from "./convoys.routes";

const ORIGIN_ID = "11111111-1111-1111-1111-111111111111";
const DESTINATION_ID = "22222222-2222-2222-2222-222222222222";
const ESCORT_ID = "33333333-3333-3333-3333-333333333333";
const VEHICLE_ID = "44444444-4444-4444-4444-444444444444";
const SECOND_VEHICLE_ID = "55555555-5555-5555-5555-555555555555";

interface TestContext {
  app: Hono;
  convoys: InMemoryConvoyRepository;
  hubs: InMemoryHubRepository;
  users: InMemoryUserRepository;
}

function buildContext(): TestContext {
  const convoys = new InMemoryConvoyRepository();
  const hubs = new InMemoryHubRepository();
  const users = new InMemoryUserRepository();
  const routes = createConvoysRoutes({
    listConvoys: new ListConvoys(convoys),
    getConvoy: new GetConvoy(convoys),
    planConvoy: new PlanConvoy(convoys, hubs, users),
    startConvoy: new StartConvoy(convoys),
    completeConvoy: new CompleteConvoy(convoys),
    cancelConvoy: new CancelConvoy(convoys),
    addVehicleToConvoy: new AddVehicleToConvoy(convoys),
  });
  const app = new Hono();
  app.route("/convoys", routes);
  return { app, convoys, hubs, users };
}

async function authHeader(role: RoleName = "ZODI_SENDER") {
  const now = Math.floor(Date.now() / 1000);
  const token = await sign(
    {
      sub: ESCORT_ID,
      username: "zodi-sender",
      role,
      iat: now,
      exp: now + 60,
    },
    config.jwtSecret,
    "HS256",
  );
  return { Authorization: `Bearer ${token}` };
}

function makeConvoy(id = crypto.randomUUID()): Convoy {
  return Convoy.create({
    id,
    origenId: ORIGIN_ID,
    destinoId: DESTINATION_ID,
    escoltaId: ESCORT_ID,
    vehicleIds: [VEHICLE_ID],
  });
}

async function seedPlanningContext(ctx: TestContext) {
  await ctx.hubs.save(
    Hub.register({
      id: ORIGIN_ID,
      name: "Salida ZODI",
      address: "Av. Principal",
      contact: "0212-555",
      type: "DISPATCH",
      latitude: 10.5,
      longitude: -66.9,
    }),
  );
  await ctx.hubs.save(
    Hub.register({
      id: DESTINATION_ID,
      name: "Destino ZODI",
      address: "Av. Final",
      contact: "0212-777",
      type: "DESTINATION",
      latitude: 10.6,
      longitude: -67.0,
    }),
  );
  await ctx.users.save(
    User.register({
      id: ESCORT_ID,
      username: "zodi-sender",
      credential: Credential.fromHash("hash"),
      role: Role.create("ZODI_SENDER"),
      email: "zodi@example.com",
    }),
  );
}

describe("convoys routes", () => {
  let ctx: TestContext;

  beforeEach(() => {
    ctx = buildContext();
  });

  test("GET /convoys is public and returns all convoys", async () => {
    await ctx.convoys.save(makeConvoy("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"));
    await ctx.convoys.save(makeConvoy("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"));

    const res = await ctx.app.request("/convoys");

    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.convoys).toHaveLength(2);
  });

  test("GET /convoys?status=EN_RUTA filters by status", async () => {
    const planned = makeConvoy("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");
    const enRuta = makeConvoy("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb");
    enRuta.dispatch();
    await ctx.convoys.save(planned);
    await ctx.convoys.save(enRuta);

    const res = await ctx.app.request("/convoys?status=EN_RUTA");

    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.convoys).toHaveLength(1);
    expect(body.convoys[0]).toMatchObject({ id: enRuta.id, status: "EN_RUTA" });
  });

  test("GET /convoys rejects invalid status query", async () => {
    const res = await ctx.app.request("/convoys?status=INVALIDO");

    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: "Datos inválidos" });
  });

  test("GET /convoys/:id is public and returns one convoy", async () => {
    const convoy = makeConvoy("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");
    await ctx.convoys.save(convoy);

    const res = await ctx.app.request(`/convoys/${convoy.id}`);

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ convoy: { id: convoy.id } });
  });

  test("GET /convoys/:id maps missing convoy to 404", async () => {
    const res = await ctx.app.request("/convoys/missing");

    expect(res.status).toBe(404);
    expect(await res.json()).toMatchObject({ code: "CONVOY_NOT_FOUND" });
  });

  test("POST /convoys requires authentication", async () => {
    const res = await ctx.app.request("/convoys", { method: "POST" });

    expect(res.status).toBe(401);
  });

  test("POST /convoys requires ZODI_SENDER role", async () => {
    const res = await ctx.app.request("/convoys", {
      method: "POST",
      headers: await authHeader("MANAGER"),
    });

    expect(res.status).toBe(403);
  });

  test("POST /convoys validates body", async () => {
    const res = await ctx.app.request("/convoys", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(await authHeader()) },
      body: JSON.stringify({ no: "valid" }),
    });

    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: "Datos inválidos" });
  });

  test("POST /convoys plans a convoy", async () => {
    await seedPlanningContext(ctx);

    const res = await ctx.app.request("/convoys", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(await authHeader()) },
      body: JSON.stringify({
        origenId: ORIGIN_ID,
        destinoId: DESTINATION_ID,
        escoltaId: ESCORT_ID,
        vehicleIds: [VEHICLE_ID],
      }),
    });

    expect(res.status).toBe(201);
    const body = (await res.json()) as any;
    expect(body.convoy).toMatchObject({
      origenId: ORIGIN_ID,
      destinoId: DESTINATION_ID,
      escoltaId: ESCORT_ID,
      vehicleIds: [VEHICLE_ID],
      status: "PLANIFICADO",
    });
  });

  test("POST /convoys/:id/dispatch starts a planned convoy", async () => {
    const convoy = makeConvoy("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");
    await ctx.convoys.save(convoy);

    const res = await ctx.app.request(`/convoys/${convoy.id}/dispatch`, {
      method: "POST",
      headers: await authHeader(),
    });

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ convoy: { id: convoy.id, status: "EN_RUTA" } });
  });

  test("POST /convoys/:id/complete maps invalid transition to 409", async () => {
    const convoy = makeConvoy("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");
    await ctx.convoys.save(convoy);

    const res = await ctx.app.request(`/convoys/${convoy.id}/complete`, {
      method: "POST",
      headers: await authHeader(),
    });

    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ code: "INVALID_TRANSITION" });
  });

  test("POST /convoys/:id/cancel cancels a planned convoy", async () => {
    const convoy = makeConvoy("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");
    await ctx.convoys.save(convoy);

    const res = await ctx.app.request(`/convoys/${convoy.id}/cancel`, {
      method: "POST",
      headers: await authHeader(),
    });

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ convoy: { id: convoy.id, status: "CANCELADO" } });
  });

  test("POST /convoys/:id/vehicles adds a vehicle", async () => {
    const convoy = makeConvoy("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");
    await ctx.convoys.save(convoy);

    const res = await ctx.app.request(`/convoys/${convoy.id}/vehicles`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(await authHeader()) },
      body: JSON.stringify({ vehicleId: SECOND_VEHICLE_ID }),
    });

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({
      convoy: { id: convoy.id, vehicleIds: [VEHICLE_ID, SECOND_VEHICLE_ID] },
    });
  });

  test("POST /convoys/:id/vehicles maps duplicate vehicle to 409", async () => {
    const convoy = makeConvoy("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");
    await ctx.convoys.save(convoy);

    const res = await ctx.app.request(`/convoys/${convoy.id}/vehicles`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(await authHeader()) },
      body: JSON.stringify({ vehicleId: VEHICLE_ID }),
    });

    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ code: "DUPLICATE_VEHICLE" });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // REQ-14 missing scenarios: S14.5, S14.11, S14.12, S14.14
  // ──────────────────────────────────────────────────────────────────────────

  test("S14.5 — POST /convoys with origenId pointing to non-DISPATCH Hub returns 400", async () => {
    await ctx.hubs.save(
      Hub.register({
        id: ORIGIN_ID,
        name: "Centro de Acopio",
        address: "Av. Principal",
        contact: "0212-555",
        type: "COLLECTION", // NOT DISPATCH
        latitude: 10.5,
        longitude: -66.9,
      }),
    );
    await ctx.hubs.save(
      Hub.register({
        id: DESTINATION_ID,
        name: "Destino",
        address: "Av. Final",
        contact: "0212-777",
        type: "DESTINATION",
        latitude: 10.6,
        longitude: -67.0,
      }),
    );
    await ctx.users.save(
      User.register({
        id: ESCORT_ID,
        username: "zodi-sender",
        credential: Credential.fromHash("hash"),
        role: Role.create("ZODI_SENDER"),
        email: "zodi@example.com",
      }),
    );

    const res = await ctx.app.request("/convoys", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(await authHeader()) },
      body: JSON.stringify({
        origenId: ORIGIN_ID,
        destinoId: DESTINATION_ID,
        escoltaId: ESCORT_ID,
        vehicleIds: [VEHICLE_ID],
      }),
    });

    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ code: "ORIGIN_NOT_DISPATCH" });
  });

  test("S14.11 — POST /convoys/:id/dispatch on EN_RUTA convoy returns 409", async () => {
    const convoy = makeConvoy("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");
    convoy.dispatch(); // Put it in EN_RUTA state
    await ctx.convoys.save(convoy);

    const res = await ctx.app.request(`/convoys/${convoy.id}/dispatch`, {
      method: "POST",
      headers: await authHeader(),
    });

    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ code: "INVALID_TRANSITION" });
  });

  test("S14.12 — POST /convoys/:id/complete on EN_RUTA convoy returns 200 ENTREGADO", async () => {
    const convoy = makeConvoy("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");
    convoy.dispatch(); // PLANIFICADO → EN_RUTA
    await ctx.convoys.save(convoy);

    const res = await ctx.app.request(`/convoys/${convoy.id}/complete`, {
      method: "POST",
      headers: await authHeader(),
    });

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({
      convoy: { id: convoy.id, status: "ENTREGADO" },
    });
  });

  test("S14.14 — POST /convoys/:id/cancel on ENTREGADO convoy returns 409", async () => {
    const convoy = makeConvoy("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");
    convoy.dispatch();
    convoy.deliver(); // PLANIFICADO → EN_RUTA → ENTREGADO (terminal)
    await ctx.convoys.save(convoy);

    const res = await ctx.app.request(`/convoys/${convoy.id}/cancel`, {
      method: "POST",
      headers: await authHeader(),
    });

    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ code: "INVALID_TRANSITION" });
  });
});
