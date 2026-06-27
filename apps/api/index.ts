import { Hono } from "hono";
import { cors } from "hono/cors";
import { join } from "path";
import {
  centroSchema,
  createNeedSchema,
  updateNeedSchema,
  type Centro,
} from "@sos/shared";
import { eq, desc } from "drizzle-orm";
import { db } from "./src/infrastructure/persistence/db";
import { hubs, resources } from "./src/infrastructure/persistence/schema/resources.schema";
import { needs } from "./src/infrastructure/persistence/schema/needs.schema";
import { createIdentityModule } from "./src/infrastructure/identity.module";
import { createResourcesModule } from "./src/infrastructure/resources.module";
import { createOperationsModule } from "./src/infrastructure/operations.module";

const app = new Hono();

const DATA_FILE_PATH = join(import.meta.dir, "data", "centros.json");

type NeedRow = typeof needs.$inferSelect;

/**
 * Mapea el row de Postgres al payload público.
 * `fechaNecesidad` viene como Date; lo serializamos a YYYY-MM-DD.
 * `ultimaActualizacion` viene como Date; lo serializamos a ISO.
 */
function toPublicNeed(row: NeedRow) {
  return {
    id: row.id,
    nombre: row.nombre,
    categoria: row.categoria,
    unidad: row.unidad,
    meta: row.meta,
    recibido: row.recibido,
    prioridad: row.prioridad,
    descripcion: row.descripcion,
    fechaNecesidad:
      row.fechaNecesidad instanceof Date
        ? row.fechaNecesidad.toISOString().split("T")[0]
        : String(row.fechaNecesidad),
    ultimaActualizacion: row.ultimaActualizacion.toISOString(),
  };
}

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
    origin: process.env.WEB_ORIGIN ?? "http://localhost:5173",
    credentials: true,
  }),
);

// Bounded context `identity` — autenticación bajo /auth.
app.route("/auth", createIdentityModule().routes);

// Bounded context `resources` — hubs y stock de insumos bajo /resources.
app.route("/resources", createResourcesModule().routes);

// Bounded context `operations` — planificación de viajes y caravanas bajo /operations.
app.route("/operations", createOperationsModule().routes);

// --- Endpoints del Servidor ---

app.get("/health", (c) =>
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

// --- Needs (necesidades) — public read + admin CRUD, persistido en Postgres (tabla `needs`) ---

app.get("/api/needs", async (c) => {
  try {
    const rows = await db.select().from(needs).orderBy(desc(needs.fechaNecesidad));
    return c.json(rows.map(toPublicNeed));
  } catch (error) {
    console.error("Error al listar necesidades:", error);
    return c.json({ error: "Error al obtener necesidades" }, 500);
  }
});

app.post("/api/needs", async (c) => {
  try {
    const body = await c.req.json().catch(() => null);
    const parsed = createNeedSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: "Datos inválidos", details: parsed.error.flatten() }, 400);
    }
    const draft = parsed.data;
    const [inserted] = await db
      .insert(needs)
      .values({
        nombre: draft.nombre,
        categoria: draft.categoria,
        unidad: draft.unidad,
        meta: draft.meta,
        recibido: draft.recibido,
        prioridad: draft.prioridad,
        descripcion: draft.descripcion,
        fechaNecesidad: draft.fechaNecesidad,
      })
      .returning();
    return c.json(toPublicNeed(inserted!), 201);
  } catch (error) {
    console.error("Error al crear necesidad:", error);
    return c.json({ error: "Error en la petición" }, 400);
  }
});

app.put("/api/needs/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json().catch(() => null);
    const parsed = updateNeedSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: "Datos inválidos", details: parsed.error.flatten() }, 400);
    }
    const patch = parsed.data;
    const [updated] = await db
      .update(needs)
      .set({
        ...patch,
        ultimaActualizacion: new Date(),
      })
      .where(eq(needs.id, id))
      .returning();
    if (!updated) return c.json({ error: "No encontrada" }, 404);
    return c.json(toPublicNeed(updated));
  } catch (error) {
    console.error("Error al actualizar necesidad:", error);
    return c.json({ error: "Error en la petición" }, 400);
  }
});

app.delete("/api/needs/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const [deleted] = await db.delete(needs).where(eq(needs.id, id)).returning();
    if (!deleted) return c.json({ error: "No encontrada" }, 404);
    return c.json({ ok: true });
  } catch (error) {
    console.error("Error al eliminar necesidad:", error);
    return c.json({ error: "Error en la petición" }, 400);
  }
});

const port = Number(process.env.PORT ?? 8081);

export default {
  port,
  fetch: app.fetch,
};
