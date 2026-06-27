import { describe, test, expect, beforeEach } from "bun:test";
import { Hono } from "hono";
import { CreateProduct } from "./create-product";
import { ListProducts } from "./list-products";
import { UpdateProduct } from "./update-product";
import { DeleteProduct } from "./delete-product";
import { InMemoryProductRepository } from "../../infrastructure/persistence/in-memory-product.repository";
import { createProductRoutes } from "../../infrastructure/http/products.routes";

function makeApp() {
  const repo = new InMemoryProductRepository();
  const useCases = {
    createProduct: new CreateProduct(repo),
    listProducts: new ListProducts(repo),
    updateProduct: new UpdateProduct(repo),
    deleteProduct: new DeleteProduct(repo),
  };
  const app = new Hono();
  app.route("/", createProductRoutes(useCases));
  return { app, repo };
}

const VALID_PRODUCT = {
  name: "Agua embotellada",
  category: "Víveres",
  unit: "litros",
  description: "Agua pura",
};

describe("GET /productos", () => {
  test("returns empty array when no products exist", async () => {
    const { app } = makeApp();
    const res = await app.fetch(new Request("http://localhost/productos"));
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(Array.isArray(body)).toBe(true);
    expect(body).toHaveLength(0);
  });

  test("returns all products", async () => {
    const { app } = makeApp();
    await app.fetch(
      new Request("http://localhost/productos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(VALID_PRODUCT),
      }),
    );
    const res = await app.fetch(new Request("http://localhost/productos"));
    const body = await res.json() as any;
    expect(Array.isArray(body)).toBe(true);
    expect(body).toHaveLength(1);
    expect(body[0].name).toBe("Agua embotellada");
  });
});

describe("POST /productos", () => {
  test("creates a product and returns 201 with the product shape", async () => {
    const { app } = makeApp();
    const res = await app.fetch(
      new Request("http://localhost/productos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(VALID_PRODUCT),
      }),
    );
    expect(res.status).toBe(201);
    const body = await res.json() as any;
    expect(body.id).toBeTruthy();
    expect(body.name).toBe("Agua embotellada");
    expect(body.category).toBe("Víveres");
    expect(body.unit).toBe("litros");
    expect(body.description).toBe("Agua pura");
  });

  test("returns 400 when name is missing", async () => {
    const { app } = makeApp();
    const res = await app.fetch(
      new Request("http://localhost/productos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: "Víveres", unit: "litros", description: "" }),
      }),
    );
    expect(res.status).toBe(400);
  });

  test("returns 400 when name is empty string", async () => {
    const { app } = makeApp();
    const res = await app.fetch(
      new Request("http://localhost/productos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "   ", category: "Víveres", unit: "litros", description: "" }),
      }),
    );
    expect(res.status).toBe(400);
  });

  test("returns 400 when category is invalid", async () => {
    const { app } = makeApp();
    const res = await app.fetch(
      new Request("http://localhost/productos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Test", category: "CategoriaInvalida", unit: "litros", description: "" }),
      }),
    );
    expect(res.status).toBe(400);
  });

  test("returns 400 when unit is missing", async () => {
    const { app } = makeApp();
    const res = await app.fetch(
      new Request("http://localhost/productos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Test", category: "Víveres", description: "" }),
      }),
    );
    expect(res.status).toBe(400);
  });

  test("returns 409 with the exact error message when name already exists", async () => {
    const { app } = makeApp();
    await app.fetch(
      new Request("http://localhost/productos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(VALID_PRODUCT),
      }),
    );
    const res = await app.fetch(
      new Request("http://localhost/productos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(VALID_PRODUCT),
      }),
    );
    expect(res.status).toBe(409);
    const body = await res.json() as any;
    expect(body.error).toBe("Ya existe un producto con este nombre en el catálogo");
  });
});

describe("PUT /productos/:id", () => {
  test("updates a product and returns 200 with updated product", async () => {
    const { app } = makeApp();
    const createRes = await app.fetch(
      new Request("http://localhost/productos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(VALID_PRODUCT),
      }),
    );
    const created = await createRes.json() as any;

    const res = await app.fetch(
      new Request(`http://localhost/productos/${created.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Agua mineral", category: "Víveres", unit: "botellas", description: "" }),
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.id).toBe(created.id);
    expect(body.name).toBe("Agua mineral");
    expect(body.unit).toBe("botellas");
  });

  test("returns 404 when product does not exist", async () => {
    const { app } = makeApp();
    const res = await app.fetch(
      new Request(`http://localhost/productos/${crypto.randomUUID()}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Test", category: "Víveres", unit: "kg", description: "" }),
      }),
    );
    expect(res.status).toBe(404);
    const body = await res.json() as any;
    expect(body.error).toBe("Producto no encontrado");
  });

  test("returns 409 when name conflicts with another existing product", async () => {
    const { app } = makeApp();
    const r1 = await app.fetch(
      new Request("http://localhost/productos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Producto A", category: "Víveres", unit: "kg", description: "" }),
      }),
    );
    await app.fetch(
      new Request("http://localhost/productos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Producto B", category: "Víveres", unit: "kg", description: "" }),
      }),
    );
    const { id } = await r1.json() as any;

    const res = await app.fetch(
      new Request(`http://localhost/productos/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Producto B", category: "Víveres", unit: "kg", description: "" }),
      }),
    );
    expect(res.status).toBe(409);
    const body = await res.json() as any;
    expect(body.error).toBe("Ya existe un producto con este nombre en el catálogo");
  });

  test("allows updating a product to keep the same name", async () => {
    const { app } = makeApp();
    const createRes = await app.fetch(
      new Request("http://localhost/productos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(VALID_PRODUCT),
      }),
    );
    const created = await createRes.json() as any;

    const res = await app.fetch(
      new Request(`http://localhost/productos/${created.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Agua embotellada", category: "Víveres", unit: "botellas", description: "Updated" }),
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.description).toBe("Updated");
  });
});

describe("DELETE /productos/:id", () => {
  test("deletes a product and returns { success: true, deleted: {...} }", async () => {
    const { app } = makeApp();
    const createRes = await app.fetch(
      new Request("http://localhost/productos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(VALID_PRODUCT),
      }),
    );
    const created = await createRes.json() as any;

    const res = await app.fetch(
      new Request(`http://localhost/productos/${created.id}`, {
        method: "DELETE",
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.success).toBe(true);
    expect(body.deleted).toBeDefined();
    expect(body.deleted.name).toBe("Agua embotellada");
    expect(body.deleted.id).toBe(created.id);
  });

  test("returns 404 when product does not exist", async () => {
    const { app } = makeApp();
    const res = await app.fetch(
      new Request(`http://localhost/productos/${crypto.randomUUID()}`, {
        method: "DELETE",
      }),
    );
    expect(res.status).toBe(404);
    const body = await res.json() as any;
    expect(body.error).toBe("Producto no encontrado");
  });

  test("product no longer available after deletion", async () => {
    const { app } = makeApp();
    const createRes = await app.fetch(
      new Request("http://localhost/productos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(VALID_PRODUCT),
      }),
    );
    const created = await createRes.json() as any;
    await app.fetch(
      new Request(`http://localhost/productos/${created.id}`, { method: "DELETE" }),
    );
    const listRes = await app.fetch(new Request("http://localhost/productos"));
    const list = await listRes.json() as any;
    expect(list).toHaveLength(0);
  });
});
