/**
 * Characterization tests for the Need slice (Strangler Fig).
 * These tests verify that the new Clean Architecture implementation
 * produces the EXACT same JSON contract as the legacy endpoints.
 *
 * TDD CYCLE: RED first — all imports target files that don't exist yet.
 */
import { beforeEach, describe, expect, test } from "bun:test";
import { Hono } from "hono";
import { sign } from "hono/jwt";
import { Hub } from "../../domain/resources/entities/hub";
import { InMemoryHubRepository } from "../../infrastructure/persistence/in-memory-hub.repository";
import { InMemoryProductCatalogRepository } from "../../infrastructure/persistence/in-memory-product-catalog.repository";
import { InMemoryNeedRepository } from "../../infrastructure/persistence/in-memory-need.repository";
import { createNeedsRoutes } from "../../infrastructure/http/needs.routes";
import { CreateNeed } from "./create-need";
import { ListNeeds } from "./list-needs";
import { UpdateNeed } from "./update-need";
import { DeleteNeed } from "./delete-need";

const TEST_SECRET = "dev-secret-change-me";

async function makeAuthHeaders(): Promise<HeadersInit> {
  const token = await sign(
    { sub: "test-user-id", username: "test-zodi", role: "ZODI_DESTINATION" },
    TEST_SECRET,
    "HS256",
  );
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

function buildApp(useCases: {
  createNeed: CreateNeed;
  listNeeds: ListNeeds;
  updateNeed: UpdateNeed;
  deleteNeed: DeleteNeed;
}) {
  const app = new Hono();
  app.route("/", createNeedsRoutes(useCases));
  return app;
}

describe("Need routes — characterization tests (legacy contract)", () => {
  let hubRepo: InMemoryHubRepository;
  let productCatalog: InMemoryProductCatalogRepository;
  let needRepo: InMemoryNeedRepository;
  let hubId: string;
  let app: Hono;
  let auth: HeadersInit;

  beforeEach(async () => {
    hubRepo = new InMemoryHubRepository();
    productCatalog = new InMemoryProductCatalogRepository();
    needRepo = new InMemoryNeedRepository(hubRepo, productCatalog);

    // Seed a hub
    const hub = Hub.register({
      id: crypto.randomUUID(),
      name: "Centro Norte",
      address: "Av. Norte 1",
      contact: "0412-111",
      type: "COLLECTION",
      latitude: 10.5,
      longitude: -66.9,
    });
    await hubRepo.save(hub);
    hubId = hub.id;

    const useCases = {
      createNeed: new CreateNeed(needRepo, productCatalog),
      listNeeds: new ListNeeds(needRepo),
      updateNeed: new UpdateNeed(needRepo),
      deleteNeed: new DeleteNeed(needRepo),
    };
    app = buildApp(useCases);
    auth = await makeAuthHeaders();
  });

  // ── GET /needs ─────────────────────────────────────────────────────────────

  test("GET /needs returns empty array when no needs exist", async () => {
    const res = await app.request("/needs");
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(Array.isArray(body)).toBe(true);
    expect(body).toHaveLength(0);
  });

  test("GET /necesidades is an alias for GET /needs", async () => {
    const res = await app.request("/necesidades");
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(Array.isArray(body)).toBe(true);
  });

  // ── POST /needs ─────────────────────────────────────────────────────────────

  test("POST /needs creates a need and auto-creates product (Víveres → kg)", async () => {
    const res = await app.request("/needs", {
      method: "POST",
      headers: auth,
      body: JSON.stringify({
        hubId,
        nombre: "Arroz blanco",
        categoria: "Víveres",
        meta: 100,
        prioridad: "ALTA",
      }),
    });

    expect(res.status).toBe(201);
    const body = await res.json() as any;
    expect(body.id).toBeDefined();
    expect(body.hubId).toBe(hubId);
    expect(body.productId).toBeDefined();
    expect(body.nombre).toBe("Arroz blanco");
    expect(body.categoria).toBe("Víveres");
    expect(body.unidad).toBe("kg"); // auto-created unit
    expect(body.meta).toBe(100);
    expect(body.recibido).toBe(0);
    expect(body.prioridad).toBe("ALTA");
    expect(body.descripcion).toBe("");
    expect(body.fechaNecesidad).toBeNull();
    expect(body.ultimaActualizacion).toBeDefined();
  });

  test("POST /needs with Medicamentos category auto-creates product with unit cajas", async () => {
    const res = await app.request("/needs", {
      method: "POST",
      headers: auth,
      body: JSON.stringify({
        hubId,
        nombre: "Ibuprofeno 400mg",
        categoria: "Medicamentos",
        meta: 50,
        prioridad: "CRITICA",
      }),
    });

    expect(res.status).toBe(201);
    const body = await res.json() as any;
    expect(body.unidad).toBe("cajas");
  });

  test("POST /needs reuses existing product when nombre matches (case-insensitive)", async () => {
    // First, add a product to the catalog
    await productCatalog.create({
      id: crypto.randomUUID(),
      name: "Agua embotellada",
      category: "Víveres",
      unit: "litros",
      description: "Agua purificada.",
    });

    const res = await app.request("/needs", {
      method: "POST",
      headers: auth,
      body: JSON.stringify({
        hubId,
        nombre: "AGUA EMBOTELLADA", // different case
        categoria: "Víveres",
        meta: 200,
        prioridad: "ALTA",
      }),
    });

    expect(res.status).toBe(201);
    const body = await res.json() as any;
    expect(body.unidad).toBe("litros"); // from existing product, not auto-created
  });

  test("POST /needs with fechaNecesidad stores and returns it", async () => {
    const res = await app.request("/needs", {
      method: "POST",
      headers: auth,
      body: JSON.stringify({
        hubId,
        nombre: "Frazadas térmicas",
        categoria: "Abrigo y refugio",
        meta: 30,
        prioridad: "MEDIA",
        fechaNecesidad: "2024-12-31",
      }),
    });

    expect(res.status).toBe(201);
    const body = await res.json() as any;
    expect(body.fechaNecesidad).toBe("2024-12-31");
  });

  test("POST /necesidades is an alias for POST /needs", async () => {
    const res = await app.request("/necesidades", {
      method: "POST",
      headers: auth,
      body: JSON.stringify({
        hubId,
        nombre: "Jabón de baño",
        categoria: "Higiene personal",
        meta: 50,
        prioridad: "BAJA",
      }),
    });
    expect(res.status).toBe(201);
  });

  test("POST /needs returns 400 when hubId is missing", async () => {
    const res = await app.request("/needs", {
      method: "POST",
      headers: auth,
      body: JSON.stringify({ nombre: "Arroz", categoria: "Víveres", meta: 10, prioridad: "ALTA" }),
    });
    expect(res.status).toBe(400);
    const body = await res.json() as any;
    expect(body.error).toBe("Faltan campos requeridos");
  });

  test("POST /needs returns 400 when nombre is missing", async () => {
    const res = await app.request("/needs", {
      method: "POST",
      headers: auth,
      body: JSON.stringify({ hubId, categoria: "Víveres", meta: 10, prioridad: "ALTA" }),
    });
    expect(res.status).toBe(400);
    const body = await res.json() as any;
    expect(body.error).toBe("Faltan campos requeridos");
  });

  test("POST /needs returns 400 when categoria is missing", async () => {
    const res = await app.request("/needs", {
      method: "POST",
      headers: auth,
      body: JSON.stringify({ hubId, nombre: "Arroz", meta: 10, prioridad: "ALTA" }),
    });
    expect(res.status).toBe(400);
    const body = await res.json() as any;
    expect(body.error).toBe("Faltan campos requeridos");
  });

  test("POST /needs returns 400 when meta is missing", async () => {
    const res = await app.request("/needs", {
      method: "POST",
      headers: auth,
      body: JSON.stringify({ hubId, nombre: "Arroz", categoria: "Víveres", prioridad: "ALTA" }),
    });
    expect(res.status).toBe(400);
    const body = await res.json() as any;
    expect(body.error).toBe("Faltan campos requeridos");
  });

  test("POST /needs returns 400 when prioridad is missing", async () => {
    const res = await app.request("/needs", {
      method: "POST",
      headers: auth,
      body: JSON.stringify({ hubId, nombre: "Arroz", categoria: "Víveres", meta: 10 }),
    });
    expect(res.status).toBe(400);
    const body = await res.json() as any;
    expect(body.error).toBe("Faltan campos requeridos");
  });

  // ── GET /needs after creation ───────────────────────────────────────────────

  test("GET /needs returns created need with joined shape", async () => {
    // Create a need first
    await app.request("/needs", {
      method: "POST",
      headers: auth,
      body: JSON.stringify({
        hubId,
        nombre: "Colchonetas",
        categoria: "Abrigo y refugio",
        meta: 20,
        prioridad: "MEDIA",
        descripcion: "Para damnificados",
      }),
    });

    const res = await app.request("/needs");
    expect(res.status).toBe(200);
    const list = await res.json() as any;

    expect(list).toHaveLength(1);
    const item = list[0];
    expect(item.id).toBeDefined();
    expect(item.hubId).toBe(hubId);
    expect(item.hubName).toBe("Centro Norte");
    expect(item.productId).toBeDefined();
    expect(item.nombre).toBe("Colchonetas");
    expect(item.categoria).toBe("Abrigo y refugio");
    expect(item.unidad).toBe("kg");
    expect(item.meta).toBe(20);
    expect(item.recibido).toBe(0);
    expect(item.prioridad).toBe("MEDIA");
    expect(item.descripcion).toBe("Para damnificados");
    expect(item.fechaNecesidad).toBeNull();
    expect(item.createdAt).toBeDefined();
    expect(item.updatedAt).toBeDefined();
  });

  test("GET /needs?hubId filters by hub", async () => {
    // Create hub 2
    const hub2 = Hub.register({
      id: crypto.randomUUID(),
      name: "Centro Sur",
      address: "Av. Sur 1",
      contact: "0414-222",
      type: "DISPATCH",
      latitude: 10.0,
      longitude: -66.5,
    });
    await hubRepo.save(hub2);

    // Create need in hub1
    await app.request("/needs", {
      method: "POST",
      headers: auth,
      body: JSON.stringify({ hubId, nombre: "Agua", categoria: "Víveres", meta: 10, prioridad: "ALTA" }),
    });

    // Create need in hub2
    await app.request("/needs", {
      method: "POST",
      headers: auth,
      body: JSON.stringify({ hubId: hub2.id, nombre: "Arroz", categoria: "Víveres", meta: 5, prioridad: "ALTA" }),
    });

    // Filter by hub1
    const res = await app.request(`/needs?hubId=${hubId}`);
    const list = await res.json() as any;
    expect(list).toHaveLength(1);
    expect(list[0].hubId).toBe(hubId);
    expect(list[0].nombre).toBe("Agua");

    // Filter by hub2
    const res2 = await app.request(`/needs?hubId=${hub2.id}`);
    const list2 = await res2.json() as any;
    expect(list2).toHaveLength(1);
    expect(list2[0].hubId).toBe(hub2.id);
  });

  // ── PUT /needs/:id ──────────────────────────────────────────────────────────

  test("PUT /needs/:id updates fields and returns the updated row", async () => {
    const createRes = await app.request("/needs", {
      method: "POST",
      headers: auth,
      body: JSON.stringify({ hubId, nombre: "Leche en polvo", categoria: "Víveres", meta: 40, prioridad: "ALTA" }),
    });
    const created = await createRes.json() as any;
    const id = created.id;

    const updateRes = await app.request(`/needs/${id}`, {
      method: "PUT",
      headers: auth,
      body: JSON.stringify({ meta: 80, recibido: 20, prioridad: "MEDIA", descripcion: "Actualizado" }),
    });

    expect(updateRes.status).toBe(200);
    const updated = await updateRes.json() as any;
    expect(updated.id).toBe(id);
    expect(updated.meta).toBe(80);
    expect(updated.recibido).toBe(20);
    expect(updated.prioridad).toBe("MEDIA");
    expect(updated.descripcion).toBe("Actualizado");
    expect(updated.hubName).toBe("Centro Norte");
    expect(updated.nombre).toBe("Leche en polvo");
  });

  test("PUT /necesidades/:id is an alias for PUT /needs/:id", async () => {
    const createRes = await app.request("/needs", {
      method: "POST",
      headers: auth,
      body: JSON.stringify({ hubId, nombre: "Aceite vegetal", categoria: "Víveres", meta: 30, prioridad: "ALTA" }),
    });
    const created = await createRes.json() as any;
    const id = created.id;

    const updateRes = await app.request(`/necesidades/${id}`, {
      method: "PUT",
      headers: auth,
      body: JSON.stringify({ meta: 60 }),
    });

    expect(updateRes.status).toBe(200);
    const updated = await updateRes.json() as any;
    expect(updated.meta).toBe(60);
  });

  test("PUT /needs/:id returns 404 when need does not exist", async () => {
    const fakeId = crypto.randomUUID();
    const res = await app.request(`/needs/${fakeId}`, {
      method: "PUT",
      headers: auth,
      body: JSON.stringify({ meta: 50 }),
    });
    expect(res.status).toBe(404);
    const body = await res.json() as any;
    expect(body.error).toBe("Necesidad no encontrada");
  });

  // ── DELETE /needs/:id ───────────────────────────────────────────────────────

  test("DELETE /needs/:id deletes and returns { ok: true }", async () => {
    const createRes = await app.request("/needs", {
      method: "POST",
      headers: auth,
      body: JSON.stringify({ hubId, nombre: "Sábanas", categoria: "Abrigo y refugio", meta: 15, prioridad: "BAJA" }),
    });
    const created = await createRes.json() as any;
    const id = created.id;

    const delRes = await app.request(`/needs/${id}`, { method: "DELETE", headers: auth });
    expect(delRes.status).toBe(200);
    const body = await delRes.json() as any;
    expect(body.ok).toBe(true);

    // Verify it's gone
    const listRes = await app.request("/needs");
    const list = await listRes.json() as any;
    expect(list).toHaveLength(0);
  });

  test("DELETE /necesidades/:id is an alias for DELETE /needs/:id", async () => {
    const createRes = await app.request("/needs", {
      method: "POST",
      headers: auth,
      body: JSON.stringify({ hubId, nombre: "Escobas", categoria: "Productos de limpieza", meta: 10, prioridad: "BAJA" }),
    });
    const created = await createRes.json() as any;
    const id = created.id;

    const delRes = await app.request(`/necesidades/${id}`, { method: "DELETE", headers: auth });
    expect(delRes.status).toBe(200);
    const body = await delRes.json() as any;
    expect(body.ok).toBe(true);
  });

  test("DELETE /needs/:id returns 404 when need does not exist", async () => {
    const fakeId = crypto.randomUUID();
    const res = await app.request(`/needs/${fakeId}`, { method: "DELETE", headers: auth });
    expect(res.status).toBe(404);
    const body = await res.json() as any;
    expect(body.error).toBe("Necesidad no encontrada");
  });

  // ── fechaNecesidad formatting ───────────────────────────────────────────────

  test("GET /needs formats fechaNecesidad as YYYY-MM-DD string", async () => {
    await app.request("/needs", {
      method: "POST",
      headers: auth,
      body: JSON.stringify({
        hubId,
        nombre: "Guantes de protección",
        categoria: "Herramientas",
        meta: 25,
        prioridad: "ALTA",
        fechaNecesidad: "2024-06-15",
      }),
    });

    const res = await app.request("/needs");
    const list = await res.json() as any;
    expect(list[0].fechaNecesidad).toBe("2024-06-15");
  });

  test("PUT /needs/:id with fechaNecesidad updates the date and returns YYYY-MM-DD", async () => {
    const createRes = await app.request("/needs", {
      method: "POST",
      headers: auth,
      body: JSON.stringify({ hubId, nombre: "Palas", categoria: "Herramientas", meta: 5, prioridad: "ALTA" }),
    });
    const created = await createRes.json() as any;
    const id = created.id;

    const updateRes = await app.request(`/needs/${id}`, {
      method: "PUT",
      headers: auth,
      body: JSON.stringify({ fechaNecesidad: "2025-03-20" }),
    });

    expect(updateRes.status).toBe(200);
    const updated = await updateRes.json() as any;
    expect(updated.fechaNecesidad).toBe("2025-03-20");
  });
});
