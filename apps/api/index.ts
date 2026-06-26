import { Hono } from "hono";
import { cors } from "hono/cors";
import { centroSchema, type Centro } from "@sos/shared";
import { join } from "path";

const app = new Hono();

// Habilitar CORS para que el frontend pueda consumir la API
app.use("/*", cors());

const DATA_FILE_PATH = join(import.meta.dir, "data", "centros.json");

// Helper para leer centros
async function readCentros(): Promise<Centro[]> {
  try {
    const file = Bun.file(DATA_FILE_PATH);
    if (!(await file.exists())) {
      return [];
    }
    return await file.json();
  } catch (error) {
    console.error("Error al leer centros:", error);
    return [];
  }
}

// Helper para guardar centros
async function writeCentros(centros: Centro[]): Promise<boolean> {
  try {
    await Bun.write(DATA_FILE_PATH, JSON.stringify(centros, null, 2));
    return true;
  } catch (error) {
    console.error("Error al escribir centros:", error);
    return false;
  }
}

// Endpoints
app.get("/health", (c) =>
  c.json({ status: "ok", service: "sos-api", ts: new Date().toISOString() })
);

app.get("/", (c) => c.text("SOS Logística API"));

// Obtener todos los centros
app.get("/api/centros", async (c) => {
  const centros = await readCentros();
  return c.json(centros);
});

// Guardar o actualizar un centro
app.post("/api/centros", async (c) => {
  try {
    const body = await c.req.json();
    const result = centroSchema.safeParse(body);

    if (!result.success) {
      return c.json({ error: "Datos inválidos", details: result.error.format() }, 400);
    }

    const newCentro = result.data;
    const centros = await readCentros();

    const existingIndex = centros.findIndex((item) => item.id === newCentro.id);
    if (existingIndex > -1) {
      centros[existingIndex] = newCentro;
    } else {
      centros.push(newCentro);
    }

    const saved = await writeCentros(centros);
    if (!saved) {
      return c.json({ error: "Error interno al guardar los datos" }, 500);
    }

    return c.json({ success: true, centro: newCentro });
  } catch (error) {
    return c.json({ error: "Error en la petición" }, 400);
  }
});

const port = Number(process.env.PORT ?? 3000);

export default {
  port,
  fetch: app.fetch,
};

