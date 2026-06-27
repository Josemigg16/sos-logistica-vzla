import { Hono } from "hono";
import { cors } from "hono/cors";
import { centroSchema, type Centro } from "@sos/shared";
import { join } from "path";
import { createIdentityModule } from "./src/infrastructure/identity.module";
import { createIncidentsModule } from "./src/infrastructure/incidents.module";

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

// Bounded context `incidents` — registro de desastres bajo /incidents.
app.route("/incidents", createIncidentsModule().routes);

const DATA_FILE_PATH = join(import.meta.dir, "data", "centros.json");
const NEEDS_FILE_PATH = join(import.meta.dir, "data", "needs.json");

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

// Helpers para necesidades — persisten a apps/api/data/needs.json
async function readNeeds(): Promise<NeedRecord[]> {
  try {
    const file = Bun.file(NEEDS_FILE_PATH);
    if (!(await file.exists())) {
      // Primera carga: inicializa el archivo con los seeds
      await Bun.write(NEEDS_FILE_PATH, JSON.stringify(SEED_NEEDS, null, 2));
      return SEED_NEEDS;
    }
    return (await file.json()) as NeedRecord[];
  } catch (error) {
    console.error("Error al leer necesidades:", error);
    return [];
  }
}

async function writeNeeds(needs: NeedRecord[]): Promise<boolean> {
  try {
    await Bun.write(NEEDS_FILE_PATH, JSON.stringify(needs, null, 2));
    return true;
  } catch (error) {
    console.error("Error al escribir necesidades:", error);
    return false;
  }
}

// --- Mock data: necesidades públicas ---
function todayPlus(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

interface NeedRecord {
  id: string;
  nombre: string;
  categoria: string;
  unidad: string;
  meta: number;
  recibido: number;
  prioridad: "CRITICA" | "ALTA" | "MEDIA" | "BAJA";
  descripcion: string;
  ultimaActualizacion: string;
  fechaNecesidad: string;
}

const SEED_NEEDS: NeedRecord[] = [
  {
    id: "nec-001",
    nombre: "Agua potable",
    categoria: "Víveres",
    unidad: "litros",
    meta: 10000,
    recibido: 3200,
    prioridad: "CRITICA",
    descripcion: "Agua purificada para consumo humano en zonas sin servicio.",
    ultimaActualizacion: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    fechaNecesidad: todayPlus(0),
  },
  {
    id: "nec-002",
    nombre: "Acetaminofén 500mg",
    categoria: "Medicamentos",
    unidad: "tabletas",
    meta: 50000,
    recibido: 18000,
    prioridad: "CRITICA",
    descripcion: "Analgésico esencial para centros de atención médica improvisados.",
    ultimaActualizacion: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    fechaNecesidad: todayPlus(1),
  },
  {
    id: "nec-003",
    nombre: "Arroz blanco",
    categoria: "Víveres",
    unidad: "kg",
    meta: 5000,
    recibido: 2800,
    prioridad: "ALTA",
    descripcion: "Alimento base para raciones diarias en albergues.",
    ultimaActualizacion: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    fechaNecesidad: todayPlus(1),
  },
  {
    id: "nec-004",
    nombre: "Pañales desechables",
    categoria: "Artículos para bebés y grupos vulnerables",
    unidad: "unidades",
    meta: 8000,
    recibido: 1100,
    prioridad: "CRITICA",
    descripcion: "Tallas medianas y grandes para bebés en albergues.",
    ultimaActualizacion: new Date(Date.now() - 1000 * 60 * 200).toISOString(),
    fechaNecesidad: todayPlus(0),
  },
  {
    id: "nec-005",
    nombre: "Frazadas / mantas",
    categoria: "Abrigo y refugio",
    unidad: "unidades",
    meta: 3000,
    recibido: 2200,
    prioridad: "MEDIA",
    descripcion: "Para familias evacuadas en zonas altas con bajas temperaturas.",
    ultimaActualizacion: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    fechaNecesidad: todayPlus(3),
  },
  {
    id: "nec-006",
    nombre: "Jabón de baño",
    categoria: "Higiene personal",
    unidad: "unidades",
    meta: 6000,
    recibido: 4500,
    prioridad: "MEDIA",
    descripcion: "Barras de jabón para higiene personal en albergues.",
    ultimaActualizacion: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
    fechaNecesidad: todayPlus(4),
  },
  {
    id: "nec-007",
    nombre: "Linternas y pilas",
    categoria: "Herramientas",
    unidad: "kits",
    meta: 1500,
    recibido: 320,
    prioridad: "ALTA",
    descripcion: "Kits de iluminación para zonas sin electricidad.",
    ultimaActualizacion: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    fechaNecesidad: todayPlus(2),
  },
  {
    id: "nec-008",
    nombre: "Cloro / desinfectante",
    categoria: "Productos de limpieza",
    unidad: "litros",
    meta: 2000,
    recibido: 1600,
    prioridad: "BAJA",
    descripcion: "Desinfectante para limpieza de espacios colectivos.",
    ultimaActualizacion: new Date(Date.now() - 1000 * 60 * 360).toISOString(),
    fechaNecesidad: todayPlus(7),
  },
];

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

// --- Needs (necesidades) — public read + admin CRUD, persistido en JSON local ---

app.get("/api/necesidades", async (c) => {
  const needs = await readNeeds();
  return c.json(needs);
});

app.post("/api/necesidades", async (c) => {
  try {
    const body = (await c.req.json()) as Partial<NeedRecord>;
    if (!body.nombre || !body.categoria || !body.unidad || !body.meta || !body.prioridad || !body.fechaNecesidad) {
      return c.json({ error: "Faltan campos requeridos" }, 400);
    }
    const newRecord: NeedRecord = {
      id: `nec-${Date.now()}`,
      nombre: body.nombre,
      categoria: body.categoria,
      unidad: body.unidad,
      meta: Number(body.meta),
      recibido: Number(body.recibido ?? 0),
      prioridad: body.prioridad,
      descripcion: body.descripcion ?? "",
      fechaNecesidad: body.fechaNecesidad,
      ultimaActualizacion: new Date().toISOString(),
    };
    const needs = await readNeeds();
    needs.push(newRecord);
    const saved = await writeNeeds(needs);
    if (!saved) return c.json({ error: "Error al guardar" }, 500);
    return c.json(newRecord, 201);
  } catch {
    return c.json({ error: "Error en la petición" }, 400);
  }
});

app.put("/api/necesidades/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const needs = await readNeeds();
    const idx = needs.findIndex((n) => n.id === id);
    if (idx === -1) return c.json({ error: "No encontrada" }, 404);

    const body = (await c.req.json()) as Partial<NeedRecord>;
    const current = needs[idx];
    const updated: NeedRecord = {
      ...current,
      ...body,
      id: current.id,
      meta: Number(body.meta ?? current.meta),
      recibido: Number(body.recibido ?? current.recibido),
      ultimaActualizacion: new Date().toISOString(),
    };
    needs[idx] = updated;
    const saved = await writeNeeds(needs);
    if (!saved) return c.json({ error: "Error al guardar" }, 500);
    return c.json(updated);
  } catch {
    return c.json({ error: "Error en la petición" }, 400);
  }
});

app.delete("/api/necesidades/:id", async (c) => {
  const id = c.req.param("id");
  const needs = await readNeeds();
  const idx = needs.findIndex((n) => n.id === id);
  if (idx === -1) return c.json({ error: "No encontrada" }, 404);
  needs.splice(idx, 1);
  const saved = await writeNeeds(needs);
  if (!saved) return c.json({ error: "Error al guardar" }, 500);
  return c.json({ ok: true });
});

const port = Number(process.env.PORT ?? 3000);

export default {
  port,
  fetch: app.fetch,
};

