import { Hono } from "hono";
import { cors } from "hono/cors";
import { centroSchema, type Centro } from "@sos/shared";
import { eq } from "drizzle-orm";
import { db } from "./src/infrastructure/persistence/db";
import { hubs, resources } from "./src/infrastructure/persistence/schema/resources.schema";
import { createIdentityModule } from "./src/infrastructure/identity.module";
import { createResourcesModule } from "./src/infrastructure/resources.module";
import { createOperationsModule } from "./src/infrastructure/operations.module";

const app = new Hono();

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

const port = Number(process.env.PORT ?? 3000);

export default {
  port,
  fetch: app.fetch,
};
