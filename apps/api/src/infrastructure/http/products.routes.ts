import { Hono } from "hono";
import type { Context } from "hono";
import { createProductSchema, updateProductSchema } from "@sos/shared";
import type { CreateProduct } from "../../application/resources/create-product";
import type { ListProducts } from "../../application/resources/list-products";
import type { UpdateProduct } from "../../application/resources/update-product";
import type { DeleteProduct } from "../../application/resources/delete-product";
import { ResourceError } from "../../domain/resources/errors";

export interface ProductRoutesDeps {
  createProduct: CreateProduct;
  listProducts: ListProducts;
  updateProduct: UpdateProduct;
  deleteProduct: DeleteProduct;
}

const ERROR_STATUS: Record<string, 404 | 409> = {
  PRODUCT_NOT_FOUND: 404,
  DUPLICATE_PRODUCT_NAME: 409,
};

/**
 * Anti-Corruption Layer (ACL) para el contrato legacy de /productos.
 * Las rutas preservan el shape exacto que consume el frontend:
 *   - GET    /productos           → array de productos
 *   - POST   /productos           → producto creado (status 201)
 *   - PUT    /productos/:id       → producto actualizado
 *   - DELETE /productos/:id       → { success: true, deleted: { ... } }
 */
function mapError(c: Context, error: unknown) {
  if (error instanceof ResourceError) {
    return c.json({ error: error.message }, ERROR_STATUS[error.code] ?? 400);
  }
  console.error("Error inesperado en productos:", error);
  return c.json({ error: "Error interno del servidor" }, 500);
}

export function createProductRoutes(deps: ProductRoutesDeps): Hono {
  const router = new Hono();

  router.get("/productos", async (c) => {
    try {
      return c.json(await deps.listProducts.execute());
    } catch (error) {
      return mapError(c, error);
    }
  });

  router.post("/productos", async (c) => {
    const parsed = createProductSchema.safeParse(
      await c.req.json().catch(() => null),
    );
    if (!parsed.success) {
      return c.json({ error: "Datos inválidos", details: parsed.error.flatten() }, 400);
    }
    try {
      return c.json(await deps.createProduct.execute(parsed.data), 201);
    } catch (error) {
      return mapError(c, error);
    }
  });

  router.put("/productos/:id", async (c) => {
    const parsed = updateProductSchema.safeParse(
      await c.req.json().catch(() => null),
    );
    if (!parsed.success) {
      return c.json({ error: "Datos inválidos", details: parsed.error.flatten() }, 400);
    }
    try {
      return c.json(await deps.updateProduct.execute(c.req.param("id"), parsed.data));
    } catch (error) {
      return mapError(c, error);
    }
  });

  router.delete("/productos/:id", async (c) => {
    try {
      const deleted = await deps.deleteProduct.execute(c.req.param("id"));
      return c.json({ success: true, deleted });
    } catch (error) {
      return mapError(c, error);
    }
  });

  return router;
}
