import { describe, test, expect, beforeEach } from "bun:test";
import { Hono } from "hono";
import { sign } from "hono/jwt";
import type { RoleName } from "@sos/shared";
import { InMemoryHubRepository } from "../persistence/in-memory-hub.repository";
import { InMemoryResourceRepository } from "../persistence/in-memory-resource.repository";
import { ListHubs } from "../../application/resources/list-hubs";
import { ListResourcesByHub } from "../../application/resources/list-resources-by-hub";
import { UpsertHub } from "../../application/resources/upsert-hub";
import { ReplaceHubInventory } from "../../application/resources/replace-hub-inventory";
import { DeleteHub } from "../../application/resources/delete-hub";
import { createCentrosRoutes } from "./centros.routes";
import { config } from "../../config";

async function authHeader(role: RoleName = "ZODI_DESTINATION") {
  const now = Math.floor(Date.now() / 1000);
  const token = await sign(
    { sub: "test-user", username: "test", role, iat: now, exp: now + 60 },
    config.jwtSecret,
    "HS256",
  );
  return { Authorization: `Bearer ${token}` };
}

function buildApp() {
  const hubs = new InMemoryHubRepository();
  const resources = new InMemoryResourceRepository();
  const routes = createCentrosRoutes({
    listHubs: new ListHubs(hubs),
    listResourcesByHub: new ListResourcesByHub(resources),
    upsertHub: new UpsertHub(hubs),
    replaceHubInventory: new ReplaceHubInventory(hubs, resources),
    deleteHub: new DeleteHub(hubs, resources),
  });
  const app = new Hono();
  app.route("/centros", routes);
  return app;
}

const CENTRO_ID = "00000000-0000-0000-0000-000000000001";

const makeCentro = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: CENTRO_ID,
  nombre: "Centro Catia",
  direccion: "Av. Principal, Catia",
  contacto: "0212-555-1234",
  responsable: "Coordinador de Centro",
  coordenadas: [-66.9, 10.5] as [number, number],
  tipo: "acopio" as const,
  inventario: { "Víveres": 100, "Medicamentos": 50 },
  ...overrides,
});

describe("GET /centros — lista vacía", () => {
  test("returns [] when no hubs exist", async () => {
    const app = buildApp();
    const res = await app.request("/centros");
    expect(res.status).toBe(200);
    expect(await res.json() as any).toEqual([]);
  });
});

describe("POST /centros — upsert hub + inventario", () => {
  test("creates hub and returns { success: true, centro }", async () => {
    const app = buildApp();
    const centro = makeCentro();

    const res = await app.request("/centros", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(await authHeader()) },
      body: JSON.stringify(centro),
    });

    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.success).toBe(true);

    // Shape del Centro (ACL contract)
    expect(body.centro).toMatchObject({
      id: CENTRO_ID,
      nombre: "Centro Catia",
      direccion: "Av. Principal, Catia",
      contacto: "0212-555-1234",
      responsable: "Coordinador de Centro",
      coordenadas: [-66.9, 10.5],
      tipo: "acopio",
      inventario: { "Víveres": 100, "Medicamentos": 50 },
    });
  });

  test("updates an existing hub (upsert)", async () => {
    const app = buildApp();

    // Create
    await app.request("/centros", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(await authHeader()) },
      body: JSON.stringify(makeCentro({ nombre: "Centro Viejo" })),
    });

    // Update
    const res = await app.request("/centros", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(await authHeader()) },
      body: JSON.stringify(makeCentro({ nombre: "Centro Actualizado" })),
    });

    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.centro.nombre).toBe("Centro Actualizado");
  });

  test("replaces inventory on second POST (not accumulates)", async () => {
    const app = buildApp();

    await app.request("/centros", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(await authHeader()) },
      body: JSON.stringify(makeCentro({ inventario: { "Víveres": 100 } })),
    });

    await app.request("/centros", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(await authHeader()) },
      body: JSON.stringify(makeCentro({ inventario: { "Medicamentos": 30 } })),
    });

    const listRes = await app.request("/centros");
    const list = await listRes.json() as any;
    // "Víveres" must be gone; only "Medicamentos" remains
    expect(list[0].inventario).toEqual({ "Medicamentos": 30 });
  });

  test("returns 400 for invalid body (auth is required first, so no auth → 401 not 400)", async () => {
    const app = buildApp();
    // With ZODI_DESTINATION auth but invalid body → 400 (schema validation)
    const res = await app.request("/centros", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(await authHeader()) },
      body: JSON.stringify({ no: "valid" }),
    });
    expect(res.status).toBe(400);
  });
});

describe("GET /centros — after POST", () => {
  test("lists hubs with correct Centro shape", async () => {
    const app = buildApp();
    await app.request("/centros", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(await authHeader()) },
      body: JSON.stringify(makeCentro()),
    });

    const res = await app.request("/centros");
    expect(res.status).toBe(200);
    const list = await res.json() as any;
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({
      id: CENTRO_ID,
      nombre: "Centro Catia",
      direccion: "Av. Principal, Catia",
      contacto: "0212-555-1234",
      responsable: "Coordinador de Centro",
      coordenadas: [-66.9, 10.5],
      tipo: "acopio",
      inventario: { "Víveres": 100, "Medicamentos": 50 },
    });
  });

  test("maps all HubType variants to TipoCentro correctly", async () => {
    const app = buildApp();
    const tipos = ["acopio", "salida", "destino"] as const;
    const authHdr = await authHeader();

    for (let i = 0; i < tipos.length; i++) {
      await app.request("/centros", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHdr },
        body: JSON.stringify({
          ...makeCentro({ tipo: tipos[i] }),
          id: `00000000-0000-0000-0000-00000000000${i + 2}`,
        }),
      });
    }

    const res = await app.request("/centros");
    const list = await res.json() as any;
    const tipos_in_response = list.map((c: { tipo: string }) => c.tipo).sort();
    expect(tipos_in_response).toEqual(["acopio", "destino", "salida"]);
  });
});

describe("Hub needs (operational signals)", () => {
  test("POST /centros stores needs and GET /centros echoes them", async () => {
    const app = buildApp();
    const needs = [
      { type: "TRANSPORT", note: "Camión 350" },
      { type: "LABOR" },
    ];

    const postRes = await app.request("/centros", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(await authHeader()) },
      body: JSON.stringify(makeCentro({ needs })),
    });
    expect(postRes.status).toBe(200);
    const postBody = (await postRes.json()) as any;
    expect(postBody.centro.needs).toEqual(needs);

    const listRes = await app.request("/centros");
    const list = (await listRes.json()) as any;
    expect(list[0].needs).toEqual(needs);
  });

  test("POST /centros without needs defaults to empty array on output", async () => {
    const app = buildApp();
    await app.request("/centros", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(await authHeader()) },
      body: JSON.stringify(makeCentro()),
    });
    const list = (await (await app.request("/centros")).json()) as any;
    expect(list[0].needs).toEqual([]);
  });

  test("POST /centros replaces needs (not accumulates)", async () => {
    const app = buildApp();
    await app.request("/centros", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(await authHeader()) },
      body: JSON.stringify(makeCentro({ needs: [{ type: "TRANSPORT" }] })),
    });
    await app.request("/centros", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(await authHeader()) },
      body: JSON.stringify(makeCentro({ needs: [{ type: "FUEL", note: "diesel" }] })),
    });
    const list = (await (await app.request("/centros")).json()) as any;
    expect(list[0].needs).toEqual([{ type: "FUEL", note: "diesel" }]);
  });
});

describe("DELETE /centros/:id", () => {
  test("returns { success: true } and removes the hub", async () => {
    const app = buildApp();
    await app.request("/centros", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(await authHeader()) },
      body: JSON.stringify(makeCentro()),
    });

    const res = await app.request(`/centros/${CENTRO_ID}`, {
      method: "DELETE",
      headers: await authHeader(),
    });
    expect(res.status).toBe(200);
    expect(await res.json() as any).toEqual({ success: true });

    const listRes = await app.request("/centros");
    expect(await listRes.json() as any).toHaveLength(0);
  });

  test("returns 404 for non-existent hub", async () => {
    const app = buildApp();
    const res = await app.request("/centros/non-existent-id", {
      method: "DELETE",
      headers: await authHeader(),
    });
    expect(res.status).toBe(404);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// REQ-15: Hub Write Guard — S15.1, S15.2, S15.3
// ────────────────────────────────────────────────────────────────────────────

describe("REQ-15 — Hub write guard on /centros", () => {
  test("S15.1 — unauthenticated POST /centros returns 401 for non-acopio types", async () => {
    const app = buildApp();
    const res = await app.request("/centros", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(makeCentro({ tipo: "destino" })),
    });
    expect(res.status).toBe(401);
  });

  test("S15.1.2 — unauthenticated POST /centros succeeds (200) for acopio (collection) type", async () => {
    const app = buildApp();
    const res = await app.request("/centros", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(makeCentro({ tipo: "acopio" })),
    });
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.success).toBe(true);
  });

  test("S15.2 — POST /centros with wrong role (DRIVER) returns 403", async () => {
    const app = buildApp();
    const res = await app.request("/centros", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(await authHeader("DRIVER" as RoleName)),
      },
      body: JSON.stringify(makeCentro({ tipo: "destino" })),
    });
    expect(res.status).toBe(403);
  });

  test("S15.3 — POST /centros with ZODI_DESTINATION role succeeds (200)", async () => {
    const app = buildApp();
    const res = await app.request("/centros", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(await authHeader("ZODI_DESTINATION")),
      },
      body: JSON.stringify(makeCentro({ tipo: "destino" })),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.success).toBe(true);
  });

  test("S15.4 — unauthenticated DELETE /centros/:id returns 401", async () => {
    const app = buildApp();
    const res = await app.request(`/centros/${CENTRO_ID}`, { method: "DELETE" });
    expect(res.status).toBe(401);
  });
});
