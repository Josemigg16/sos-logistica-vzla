import { describe, test, expect, beforeEach } from "bun:test";
import { Hono } from "hono";
import { InMemoryHubRepository } from "../persistence/in-memory-hub.repository";
import { InMemoryResourceRepository } from "../persistence/in-memory-resource.repository";
import { ListHubs } from "../../application/resources/list-hubs";
import { ListResourcesByHub } from "../../application/resources/list-resources-by-hub";
import { UpsertHub } from "../../application/resources/upsert-hub";
import { ReplaceHubInventory } from "../../application/resources/replace-hub-inventory";
import { DeleteHub } from "../../application/resources/delete-hub";
import { createCentrosRoutes } from "./centros.routes";

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
    expect(await res.json()).toEqual([]);
  });
});

describe("POST /centros — upsert hub + inventario", () => {
  test("creates hub and returns { success: true, centro }", async () => {
    const app = buildApp();
    const centro = makeCentro();

    const res = await app.request("/centros", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(centro),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
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
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(makeCentro({ nombre: "Centro Viejo" })),
    });

    // Update
    const res = await app.request("/centros", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(makeCentro({ nombre: "Centro Actualizado" })),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.centro.nombre).toBe("Centro Actualizado");
  });

  test("replaces inventory on second POST (not accumulates)", async () => {
    const app = buildApp();

    await app.request("/centros", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(makeCentro({ inventario: { "Víveres": 100 } })),
    });

    await app.request("/centros", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(makeCentro({ inventario: { "Medicamentos": 30 } })),
    });

    const listRes = await app.request("/centros");
    const list = await listRes.json();
    // "Víveres" must be gone; only "Medicamentos" remains
    expect(list[0].inventario).toEqual({ "Medicamentos": 30 });
  });

  test("returns 400 for invalid body", async () => {
    const app = buildApp();
    const res = await app.request("/centros", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(makeCentro()),
    });

    const res = await app.request("/centros");
    expect(res.status).toBe(200);
    const list = await res.json();
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

    for (let i = 0; i < tipos.length; i++) {
      await app.request("/centros", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...makeCentro({ tipo: tipos[i] }),
          id: `00000000-0000-0000-0000-00000000000${i + 2}`,
        }),
      });
    }

    const res = await app.request("/centros");
    const list = await res.json();
    const tipos_in_response = list.map((c: { tipo: string }) => c.tipo).sort();
    expect(tipos_in_response).toEqual(["acopio", "destino", "salida"]);
  });
});

describe("DELETE /centros/:id", () => {
  test("returns { success: true } and removes the hub", async () => {
    const app = buildApp();
    await app.request("/centros", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(makeCentro()),
    });

    const res = await app.request(`/centros/${CENTRO_ID}`, { method: "DELETE" });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });

    const listRes = await app.request("/centros");
    expect(await listRes.json()).toHaveLength(0);
  });

  test("returns 404 for non-existent hub", async () => {
    const app = buildApp();
    const res = await app.request("/centros/non-existent-id", { method: "DELETE" });
    expect(res.status).toBe(404);
  });
});
