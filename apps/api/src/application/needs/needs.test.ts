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
import { PublishNeed } from "./publish-need";
import { BulkCreateNeeds } from "./bulk-create-needs";

const TEST_SECRET = "dev-secret-change-me";

async function makeAuthHeaders(role = "ZODI_DESTINATION"): Promise<Record<string, string>> {
  const token = await sign(
    { sub: "test-user-id", username: "test-zodi", role },
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
  publishNeed: PublishNeed;
  bulkCreateNeeds: BulkCreateNeeds;
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
  let auth: Record<string, string>;

  beforeEach(async () => {
    hubRepo = new InMemoryHubRepository();
    productCatalog = new InMemoryProductCatalogRepository();
    needRepo = new InMemoryNeedRepository(hubRepo, productCatalog);

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

    const createNeed = new CreateNeed(needRepo, productCatalog);
    const useCases = {
      createNeed,
      listNeeds: new ListNeeds(needRepo),
      updateNeed: new UpdateNeed(needRepo),
      deleteNeed: new DeleteNeed(needRepo),
      publishNeed: new PublishNeed(needRepo),
      bulkCreateNeeds: new BulkCreateNeeds(createNeed),
    };
    app = buildApp(useCases);
    auth = await makeAuthHeaders();
  });

  // ── GET /needs (public — only PUBLISHED) ────────────────────────────────────

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

  test("GET /needs does not return DRAFT needs (only PUBLISHED)", async () => {
    await app.request("/needs", {
      method: "POST",
      headers: auth,
      body: JSON.stringify({ hubId, nombre: "Arroz blanco", categoria: "Víveres", meta: 100, prioridad: "ALTA" }),
    });

    const res = await app.request("/needs");
    const list = await res.json() as any;
    expect(list).toHaveLength(0);
  });

  test("GET /needs?includeDrafts=true with admin auth returns DRAFT needs", async () => {
    await app.request("/needs", {
      method: "POST",
      headers: auth,
      body: JSON.stringify({ hubId, nombre: "Arroz blanco", categoria: "Víveres", meta: 100, prioridad: "ALTA" }),
    });

    const adminAuth = await makeAuthHeaders("ADMIN");
    const res = await app.request("/needs?includeDrafts=true", {
      headers: { Authorization: adminAuth.Authorization! },
    });
    const list = await res.json() as any;
    expect(list).toHaveLength(1);
    expect(list[0].status).toBe("DRAFT");
  });

  test("GET /needs?includeDrafts=true without auth still only returns PUBLISHED", async () => {
    await app.request("/needs", {
      method: "POST",
      headers: auth,
      body: JSON.stringify({ hubId, nombre: "Arroz blanco", categoria: "Víveres", meta: 100, prioridad: "ALTA" }),
    });

    const res = await app.request("/needs?includeDrafts=true");
    const list = await res.json() as any;
    expect(list).toHaveLength(0);
  });

  // ── POST /needs ─────────────────────────────────────────────────────────────

  test("POST /needs creates a need as DRAFT with auto-created product (Víveres → kg)", async () => {
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
    expect(body.unidad).toBe("kg");
    expect(body.meta).toBe(100);
    expect(body.recibido).toBe(0);
    expect(body.prioridad).toBe("ALTA");
    expect(body.descripcion).toBe("");
    expect(body.status).toBe("DRAFT");
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
    expect(body.status).toBe("DRAFT");
  });

  test("POST /needs reuses existing product when nombre matches (case-insensitive)", async () => {
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
        nombre: "AGUA EMBOTELLADA",
        categoria: "Víveres",
        meta: 200,
        prioridad: "ALTA",
      }),
    });

    expect(res.status).toBe(201);
    const body = await res.json() as any;
    expect(body.unidad).toBe("litros");
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

  test("POST /needs succeeds without hubId (hubId is optional)", async () => {
    const res = await app.request("/needs", {
      method: "POST",
      headers: auth,
      body: JSON.stringify({ nombre: "Arroz", categoria: "Víveres", meta: 10, prioridad: "ALTA" }),
    });
    expect(res.status).toBe(201);
    const body = await res.json() as any;
    expect(body.hubId).toBeUndefined();
    expect(body.nombre).toBe("Arroz");
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
  });

  test("POST /needs returns 400 when meta is missing", async () => {
    const res = await app.request("/needs", {
      method: "POST",
      headers: auth,
      body: JSON.stringify({ hubId, nombre: "Arroz", categoria: "Víveres", prioridad: "ALTA" }),
    });
    expect(res.status).toBe(400);
  });

  test("POST /needs returns 400 when prioridad is missing", async () => {
    const res = await app.request("/needs", {
      method: "POST",
      headers: auth,
      body: JSON.stringify({ hubId, nombre: "Arroz", categoria: "Víveres", meta: 10 }),
    });
    expect(res.status).toBe(400);
  });

  // ── PUT /needs/:id/publish ──────────────────────────────────────────────────

  test("PUT /needs/:id/publish changes status to PUBLISHED and makes it visible on GET /needs", async () => {
    const createRes = await app.request("/needs", {
      method: "POST",
      headers: auth,
      body: JSON.stringify({ hubId, nombre: "Colchonetas", categoria: "Abrigo y refugio", meta: 20, prioridad: "MEDIA" }),
    });
    const created = await createRes.json() as any;
    expect(created.status).toBe("DRAFT");

    const publishRes = await app.request(`/needs/${created.id}/publish`, {
      method: "PUT",
      headers: auth,
    });
    expect(publishRes.status).toBe(200);
    const published = await publishRes.json() as any;
    expect(published.status).toBe("PUBLISHED");

    const listRes = await app.request("/needs");
    const list = await listRes.json() as any;
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe(created.id);
    expect(list[0].status).toBe("PUBLISHED");
  });

  test("PUT /needs/:id/publish returns 404 for unknown id", async () => {
    const res = await app.request(`/needs/${crypto.randomUUID()}/publish`, {
      method: "PUT",
      headers: auth,
    });
    expect(res.status).toBe(404);
  });

  // ── POST /needs/bulk ────────────────────────────────────────────────────────

  test("POST /needs/bulk creates multiple needs as DRAFT", async () => {
    const res = await app.request("/needs/bulk", {
      method: "POST",
      headers: auth,
      body: JSON.stringify({
        nombres: ["Maquinaria pesada", "Ecoflow", "Starlink"],
        categoria: "Herramientas",
        prioridad: "ALTA",
        meta: 1,
        fechaNecesidad: "2026-07-15",
      }),
    });

    expect(res.status).toBe(201);
    const body = await res.json() as any;
    expect(body.count).toBe(3);
    expect(body.created).toHaveLength(3);
    expect(body.created[0].status).toBe("DRAFT");
    expect(body.created[0].nombre).toBe("Maquinaria pesada");
    expect(body.created[1].nombre).toBe("Ecoflow");

    // Not visible on public endpoint yet
    const listRes = await app.request("/needs");
    const list = await listRes.json() as any;
    expect(list).toHaveLength(0);
  });

  test("POST /needs/bulk skips empty lines", async () => {
    const res = await app.request("/needs/bulk", {
      method: "POST",
      headers: auth,
      body: JSON.stringify({
        nombres: ["Herramienta A", "", "  ", "Herramienta B"],
        categoria: "Herramientas",
        prioridad: "MEDIA",
        meta: 1,
      }),
    });

    expect(res.status).toBe(201);
    const body = await res.json() as any;
    expect(body.count).toBe(2);
  });

  test("POST /needs/bulk returns 400 when nombres is empty", async () => {
    const res = await app.request("/needs/bulk", {
      method: "POST",
      headers: auth,
      body: JSON.stringify({ nombres: [], categoria: "Herramientas", prioridad: "ALTA", meta: 1 }),
    });
    expect(res.status).toBe(400);
  });

  test("POST /needs/bulk returns 400 when categoria is missing", async () => {
    const res = await app.request("/needs/bulk", {
      method: "POST",
      headers: auth,
      body: JSON.stringify({ nombres: ["Agua"], prioridad: "ALTA", meta: 1 }),
    });
    expect(res.status).toBe(400);
  });

  // ── GET /needs after publish ────────────────────────────────────────────────

  test("GET /needs returns published need with joined shape", async () => {
    const createRes = await app.request("/needs", {
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
    const created = await createRes.json() as any;

    await app.request(`/needs/${created.id}/publish`, { method: "PUT", headers: auth });

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
    expect(item.status).toBe("PUBLISHED");
    expect(item.fechaNecesidad).toBeNull();
    expect(item.createdAt).toBeDefined();
    expect(item.updatedAt).toBeDefined();
  });

  test("GET /needs?hubId filters by hub (only published)", async () => {
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

    const r1 = await app.request("/needs", {
      method: "POST",
      headers: auth,
      body: JSON.stringify({ hubId, nombre: "Agua", categoria: "Víveres", meta: 10, prioridad: "ALTA" }),
    });
    const r2 = await app.request("/needs", {
      method: "POST",
      headers: auth,
      body: JSON.stringify({ hubId: hub2.id, nombre: "Arroz", categoria: "Víveres", meta: 5, prioridad: "ALTA" }),
    });
    const id1 = (await r1.json() as any).id;
    const id2 = (await r2.json() as any).id;

    await app.request(`/needs/${id1}/publish`, { method: "PUT", headers: auth });
    await app.request(`/needs/${id2}/publish`, { method: "PUT", headers: auth });

    const res = await app.request(`/needs?hubId=${hubId}`);
    const list = await res.json() as any;
    expect(list).toHaveLength(1);
    expect(list[0].hubId).toBe(hubId);
    expect(list[0].nombre).toBe("Agua");

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

    // Publish first so it's visible, then delete
    await app.request(`/needs/${id}/publish`, { method: "PUT", headers: auth });
    const listBefore = await (await app.request("/needs")).json() as any;
    expect(listBefore).toHaveLength(1);

    const delRes = await app.request(`/needs/${id}`, { method: "DELETE", headers: auth });
    expect(delRes.status).toBe(200);
    const body = await delRes.json() as any;
    expect(body.ok).toBe(true);

    const listAfter = await (await app.request("/needs")).json() as any;
    expect(listAfter).toHaveLength(0);
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
    const createRes = await app.request("/needs", {
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
    const created = await createRes.json() as any;
    await app.request(`/needs/${created.id}/publish`, { method: "PUT", headers: auth });

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
