import { Hono } from "hono";
import { cors } from "hono/cors";
import { centroSchema, type Centro } from "@sos/shared";
import { join } from "path";
import { createIdentityModule } from "./src/infrastructure/identity.module";

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

// --- Mock data: necesidades públicas ---
function todayPlus(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

const necesidadesMock = [
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

// Obtener necesidades públicas actuales
app.get("/api/necesidades", (c) => {
  return c.json(necesidadesMock);
});

const port = Number(process.env.PORT ?? 3000);

export default {
  port,
  fetch: app.fetch,
};

