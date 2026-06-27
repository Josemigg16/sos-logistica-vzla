import { Hono } from "hono";
import type { Context } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { join } from "path";
import {
  centroSchema,
  type Centro,
  INVENTORY_CATEGORIES,
} from "@sos/shared";
import { eq, sql, desc } from "drizzle-orm";
import { db } from "./src/infrastructure/persistence/db";
import { hubs, resources, products, needs } from "./src/infrastructure/persistence/schema/resources.schema";
import { createIdentityModule } from "./src/infrastructure/identity.module";
import { createResourcesModule } from "./src/infrastructure/resources.module";
import { createOperationsModule } from "./src/infrastructure/operations.module";
import { createFleetModule } from "./src/infrastructure/fleet.module";

const app = new Hono();

app.use("*", logger());

const DATA_FILE_PATH = join(import.meta.dir, "data", "centros.json");

async function readCentros(): Promise<Centro[]> {
  try {
    const file = Bun.file(DATA_FILE_PATH);
    if (!await file.exists()) return [];
    return await file.json();
  } catch {
    return [];
  }
}

async function writeCentros(data: Centro[]): Promise<boolean> {
  try {
    await Bun.write(DATA_FILE_PATH, JSON.stringify(data, null, 2));
    return true;
  } catch {
    return false;
  }
}

// CORS con credenciales para que el frontend mande la cookie del refresh token.
app.use(
  "/*",
  cors({
    origin: (origin) => origin,
    credentials: true,
  }),
);

// Obtener todos los productos (catálogo maestro) desde Postgres vía Drizzle
app.get("/api/productos", async (c) => {
  try {
    const list = await db.select().from(products);
    return c.json(list);
  } catch (error) {
    console.error("Error al obtener productos de la DB:", error);
    return c.json({ error: "Error al obtener productos" }, 500);
  }
});

// Crear un nuevo producto en el catálogo maestro
app.post("/api/productos", async (c) => {
  try {
    const body = await c.req.json();
    const { name, category, unit, description } = body;

    // Validaciones básicas
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return c.json({ error: "El nombre es requerido y debe ser texto" }, 400);
    }
    if (!category || !INVENTORY_CATEGORIES.includes(category as any)) {
      return c.json({ error: `La categoría debe ser una de: ${INVENTORY_CATEGORIES.join(", ")}` }, 400);
    }
    if (!unit || typeof unit !== "string" || unit.trim().length === 0) {
      return c.json({ error: "La unidad de medida es requerida y debe ser texto" }, 400);
    }

    // Verificar si el nombre ya existe para evitar errores de clave única
    const existing = await db
      .select()
      .from(products)
      .where(eq(products.name, name.trim()))
      .limit(1);

    if (existing.length > 0) {
      return c.json({ error: "Ya existe un producto con este nombre en el catálogo" }, 409);
    }

    const [newProduct] = await db
      .insert(products)
      .values({
        name: name.trim(),
        category: category as any,
        unit: unit.trim(),
        description: (description || "").trim(),
      })
      .returning();

    return c.json(newProduct, 201);
  } catch (error) {
    console.error("Error al crear producto en la DB:", error);
    return c.json({ error: "Error interno del servidor al crear producto" }, 500);
  }
});

// Toda la API cuelga de /api: un solo prefijo para que el nginx la sirva
// same-origin bajo /api y el frontend hable contra una sola base.

// Bounded context `identity` — autenticación bajo /api/auth.
app.route("/api/auth", createIdentityModule().routes);

// Bounded context `resources` — hubs y stock de insumos bajo /api/resources.
app.route("/api/resources", createResourcesModule().routes);

// Bounded context `operations` — planificación de viajes bajo /api/operations.
app.route("/api/operations", createOperationsModule().routes);

// Bounded context `fleet` — choferes, vehículos y tipos de vehículo bajo /api/fleet.
app.route("/api/fleet", createFleetModule().routes);

// --- Endpoints del Servidor ---

app.get("/api/health", (c) =>
  c.json({ status: "ok", service: "sos-api", ts: new Date().toISOString() })
);

app.get("/", (c) => c.text("SOS Logística API"));

// Diccionarios de traducción de tipos de hubs entre API/Frontend y Base de Datos (Postgres)
const DB_TO_API_TYPE = {
  COLLECTION: "acopio",
  DISPATCH: "salida",
  DESTINATION: "destino",
} as const;

const API_TO_DB_TYPE = {
  acopio: "COLLECTION",
  salida: "DISPATCH",
  destino: "DESTINATION",
} as const;

// Obtener todos los centros (hubs) desde Postgres vía Drizzle
app.get("/api/centros", async (c) => {
  try {
    const rows = await db.query.hubs.findMany({
      with: {
        resources: true,
      },
    });

    const centros: Centro[] = rows.map((hub) => {
      // Mapeamos el inventario normalizado a formato Record<string, number>
      const inventario: Record<string, number> = {};
      for (const res of hub.resources) {
        inventario[res.category] = res.quantity;
      }

      return {
        id: hub.id,
        nombre: hub.name,
        direccion: hub.address,
        contacto: hub.contact,
        responsable: "Coordinador de Centro",
        coordenadas: [hub.longitude, hub.latitude],
        tipo: DB_TO_API_TYPE[hub.type as keyof typeof DB_TO_API_TYPE] ?? "acopio",
        inventario,
      };
    });

    return c.json(centros);
  } catch (error) {
    console.error("Error al obtener centros de la DB:", error);
    return c.json({ error: "Error al obtener centros" }, 500);
  }
});

// Guardar o actualizar un centro (hub) en Postgres vía Drizzle
app.post("/api/centros", async (c) => {
  try {
    const body = await c.req.json();
    const result = centroSchema.safeParse(body);

    if (!result.success) {
      return c.json({ error: "Datos inválidos", details: result.error.format() }, 400);
    }

    const newCentro = result.data;

    // Guardar o actualizar Hub
    await db
      .insert(hubs)
      .values({
        id: newCentro.id,
        name: newCentro.nombre,
        address: newCentro.direccion,
        contact: newCentro.contacto,
        type: API_TO_DB_TYPE[newCentro.tipo] as any,
        latitude: newCentro.coordenadas[1],
        longitude: newCentro.coordenadas[0],
      })
      .onConflictDoUpdate({
        target: hubs.id,
        set: {
          name: newCentro.nombre,
          address: newCentro.direccion,
          contact: newCentro.contacto,
          type: API_TO_DB_TYPE[newCentro.tipo] as any,
          latitude: newCentro.coordenadas[1],
          longitude: newCentro.coordenadas[0],
        },
      });

    // Guardar o actualizar Inventario en la tabla resources
    // Para simplificar, limpiamos los items de este centro e insertamos los nuevos
    await db.delete(resources).where(eq(resources.hubId, newCentro.id));

    if (Object.keys(newCentro.inventario).length > 0) {
      const resourceValues = Object.entries(newCentro.inventario).map(([category, qty]) => ({
        id: crypto.randomUUID(),
        hubId: newCentro.id,
        category: category as any,
        quantity: qty,
        unit: "unidades",
      }));
      await db.insert(resources).values(resourceValues);
    }

    return c.json({ success: true, centro: newCentro });
  } catch (error) {
    console.error("Error al guardar centro en la DB:", error);
    return c.json({ error: "Error interno al guardar los datos" }, 500);
  }
});

// Eliminar un centro
app.delete("/api/centros/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const centros = await readCentros();
    const existingIndex = centros.findIndex((item) => item.id === id);
    if (existingIndex === -1) {
      return c.json({ error: "Centro no encontrado" }, 404);
    }
    centros.splice(existingIndex, 1);
    const saved = await writeCentros(centros);
    if (!saved) {
      return c.json({ error: "Error interno al guardar los datos" }, 500);
    }
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: "Error en la petición" }, 400);
  }
});

// --- Needs (necesidades) — public read + admin CRUD, persistido en base de datos relacional ---

const getNeedsHandler = async (c: Context) => {
  try {
    const hubId = c.req.query("hubId");
    let query = db
      .select({
        id: needs.id,
        hubId: needs.hubId,
        hubName: hubs.name,
        productId: needs.productId,
        nombre: products.name,
        categoria: products.category,
        unidad: products.unit,
        meta: needs.meta,
        recibido: needs.recibido,
        prioridad: needs.prioridad,
        descripcion: needs.descripcion,
        fechaNecesidad: needs.fechaNecesidad,
        createdAt: needs.createdAt,
        updatedAt: needs.updatedAt,
      })
      .from(needs)
      .innerJoin(hubs, eq(needs.hubId, hubs.id))
      .innerJoin(products, eq(needs.productId, products.id));

    if (hubId) {
      query = query.where(eq(needs.hubId, hubId)) as any;
    }

    const list = await query.orderBy(desc(needs.createdAt));
    const formatted = list.map((n) => ({
      ...n,
      fechaNecesidad: n.fechaNecesidad ? n.fechaNecesidad.toISOString().split("T")[0] : null,
    }));
    return c.json(formatted);
  } catch (error) {
    console.error("Error al obtener necesidades:", error);
    return c.json({ error: "Error al obtener necesidades" }, 500);
  }
};

app.get("/api/necesidades", getNeedsHandler);
app.get("/api/needs", getNeedsHandler);

const postNeedsHandler = async (c: Context) => {
  try {
    const body = await c.req.json();
    if (!body.hubId || !body.nombre || !body.categoria || !body.meta || !body.prioridad) {
      return c.json({ error: "Faltan campos requeridos" }, 400);
    }

    // 1. Search for existing product (case-insensitive check on name)
    let product: any = await db
      .select()
      .from(products)
      .where(eq(sql`LOWER(${products.name})`, body.nombre.toLowerCase()))
      .limit(1)
      .then((r) => r[0]);

    // 2. Create if not exists with automated unit: general = kg, Medicamentos = cajas
    if (!product) {
      const unit = body.categoria === "Medicamentos" ? "cajas" : "kg";
      const productId = crypto.randomUUID();
      await db.insert(products).values({
        id: productId,
        name: body.nombre,
        category: body.categoria,
        unit: unit,
        description: `Creado automáticamente al registrar una necesidad.`,
      });
      product = { id: productId, name: body.nombre, category: body.categoria, unit } as any;
    }

    // 3. Create the need
    const needId = crypto.randomUUID();
    const draft = {
      id: needId,
      hubId: body.hubId,
      productId: product.id,
      meta: Number(body.meta),
      recibido: Number(body.recibido ?? 0),
      prioridad: body.prioridad,
      descripcion: body.descripcion ?? "",
      fechaNecesidad: body.fechaNecesidad ? new Date(body.fechaNecesidad) : null,
    };

    await db.insert(needs).values(draft);

    const result = {
      id: needId,
      hubId: body.hubId,
      productId: product.id,
      nombre: product.name,
      categoria: product.category,
      unidad: product.unit,
      meta: draft.meta,
      recibido: draft.recibido,
      prioridad: draft.prioridad,
      descripcion: draft.descripcion,
      fechaNecesidad: body.fechaNecesidad ?? null,
      ultimaActualizacion: new Date().toISOString(),
    };

    return c.json(result, 201);
  } catch (error) {
    console.error("Error al crear necesidad:", error);
    return c.json({ error: "Error interno en el servidor" }, 500);
  }
};

app.post("/api/necesidades", postNeedsHandler);
app.post("/api/needs", postNeedsHandler);

const putNeedsHandler = async (c: Context) => {
  try {
    const id = c.req.param("id") as string;
    const body = await c.req.json();

    const needExists = await db
      .select()
      .from(needs)
      .where(eq(needs.id, id))
      .limit(1)
      .then((r) => r[0]);

    if (!needExists) {
      return c.json({ error: "Necesidad no encontrada" }, 404);
    }

    await db
      .update(needs)
      .set({
        meta: body.meta !== undefined ? Number(body.meta) : undefined,
        recibido: body.recibido !== undefined ? Number(body.recibido) : undefined,
        prioridad: body.prioridad ?? undefined,
        descripcion: body.descripcion ?? undefined,
        fechaNecesidad: body.fechaNecesidad ? new Date(body.fechaNecesidad) : undefined,
        updatedAt: new Date(),
      })
      .where(eq(needs.id, id));

    const updated = await db
      .select({
        id: needs.id,
        hubId: needs.hubId,
        hubName: hubs.name,
        productId: needs.productId,
        nombre: products.name,
        categoria: products.category,
        unidad: products.unit,
        meta: needs.meta,
        recibido: needs.recibido,
        prioridad: needs.prioridad,
        descripcion: needs.descripcion,
        fechaNecesidad: needs.fechaNecesidad,
      })
      .from(needs)
      .innerJoin(hubs, eq(needs.hubId, hubs.id))
      .innerJoin(products, eq(needs.productId, products.id))
      .where(eq(needs.id, id))
      .limit(1)
      .then((r) => r[0]);

    return c.json({
      ...updated,
      fechaNecesidad: updated?.fechaNecesidad ? updated.fechaNecesidad.toISOString().split("T")[0] : null,
    });
  } catch (error) {
    console.error("Error al actualizar necesidad:", error);
    return c.json({ error: "Error interno en el servidor" }, 500);
  }
};

app.put("/api/necesidades/:id", putNeedsHandler);
app.put("/api/needs/:id", putNeedsHandler);

const deleteNeedsHandler = async (c: Context) => {
  try {
    const id = c.req.param("id") as string;
    const deleted = await db.delete(needs).where(eq(needs.id, id)).returning();
    if (deleted.length === 0) {
      return c.json({ error: "Necesidad no encontrada" }, 404);
    }
    return c.json({ ok: true });
  } catch (error) {
    console.error("Error al eliminar necesidad:", error);
    return c.json({ error: "Error interno en el servidor" }, 500);
  }
};

app.delete("/api/necesidades/:id", deleteNeedsHandler);
app.delete("/api/needs/:id", deleteNeedsHandler);

const port = Number(process.env.PORT ?? 8081);

export default {
  port,
  fetch: app.fetch,
};
