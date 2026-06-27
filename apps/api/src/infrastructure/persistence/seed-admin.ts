/**
 * Crea el primer usuario ADMIN para poder arrancar y siembra el Incidente único
 * por defecto sobre el cual operará toda la logística.
 * Uso: SEED_ADMIN_USER=admin SEED_ADMIN_PASS=... bun run seed
 *
 * NOTA: requiere que las tablas ya existan (las migraciones las corre otro).
 */
import { RegisterUser } from "../../application/identity/register-user";
import { DrizzleUserRepository } from "./drizzle-user.repository";
import { BunPasswordHasher } from "../auth/bun-password-hasher";
import { UsernameTakenError } from "../../domain/identity/errors";
import { db } from "./db";
import { incidents } from "./schema/incidents.schema";
import { needs } from "./schema/needs.schema";

function todayPlus(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0]!;
}

const username = process.env.SEED_ADMIN_USER ?? "admin";
const password = process.env.SEED_ADMIN_PASS ?? "changeme123";

const registerUser = new RegisterUser(
  new DrizzleUserRepository(),
  new BunPasswordHasher(),
);

// 1. Sembrar el administrador
try {
  const user = await registerUser.execute({ username, password, role: "ADMIN" });
  console.log(`✅ Admin creado: ${user.username} (${user.id})`);
} catch (error) {
  if (error instanceof UsernameTakenError) {
    console.log(`ℹ️  El usuario "${username}" ya existe — nada que hacer.`);
  } else {
    console.error("❌ Falló el seed del admin:", error);
    process.exit(1);
  }
}

// 2. Sembrar el incidente único (por defecto)
const DEFAULT_INCIDENT_ID = "00000000-0000-0000-0000-000000000001";

try {
  await db
    .insert(incidents)
    .values({
      id: DEFAULT_INCIDENT_ID,
      title: "Terremoto Central - La Guaira & Caracas",
      description: "Respuesta logística y coordinación de ayuda humanitaria ciudadana para mitigar los daños y abastecer a los refugios.",
      type: "Terremoto",
      priority: "CRITICAL",
      status: "ACTIVE",
      zone: "La Guaira / Caracas",
      latitude: 10.6012,
      longitude: -66.9312,
    })
    .onConflictDoNothing();
  console.log(`✅ Incidente único sembrado con ID: ${DEFAULT_INCIDENT_ID}`);
} catch (error) {
  console.error("❌ Falló el seed del incidente por defecto:", error);
  process.exit(1);
}

// 3. Sembrar las 8 necesidades iniciales (solo si la tabla está vacía)
try {
  const existing = await db.select().from(needs).limit(1);
  if (existing.length === 0) {
    await db.insert(needs).values([
      {
        nombre: "Agua potable",
        categoria: "Víveres",
        unidad: "litros",
        meta: 10000,
        recibido: 3200,
        prioridad: "CRITICA",
        descripcion: "Agua purificada para consumo humano en zonas sin servicio.",
        fechaNecesidad: todayPlus(0),
      },
      {
        nombre: "Acetaminofén 500mg",
        categoria: "Medicamentos",
        unidad: "tabletas",
        meta: 50000,
        recibido: 18000,
        prioridad: "CRITICA",
        descripcion: "Analgésico esencial para centros de atención médica improvisados.",
        fechaNecesidad: todayPlus(1),
      },
      {
        nombre: "Arroz blanco",
        categoria: "Víveres",
        unidad: "kg",
        meta: 5000,
        recibido: 2800,
        prioridad: "ALTA",
        descripcion: "Alimento base para raciones diarias en albergues.",
        fechaNecesidad: todayPlus(1),
      },
      {
        nombre: "Pañales desechables",
        categoria: "Artículos para bebés y grupos vulnerables",
        unidad: "unidades",
        meta: 8000,
        recibido: 1100,
        prioridad: "CRITICA",
        descripcion: "Tallas medianas y grandes para bebés en albergues.",
        fechaNecesidad: todayPlus(0),
      },
      {
        nombre: "Frazadas / mantas",
        categoria: "Abrigo y refugio",
        unidad: "unidades",
        meta: 3000,
        recibido: 2200,
        prioridad: "MEDIA",
        descripcion: "Para familias evacuadas en zonas altas con bajas temperaturas.",
        fechaNecesidad: todayPlus(3),
      },
      {
        nombre: "Jabón de baño",
        categoria: "Higiene personal",
        unidad: "unidades",
        meta: 6000,
        recibido: 4500,
        prioridad: "MEDIA",
        descripcion: "Barras de jabón para higiene personal en albergues.",
        fechaNecesidad: todayPlus(4),
      },
      {
        nombre: "Linternas y pilas",
        categoria: "Herramientas",
        unidad: "kits",
        meta: 1500,
        recibido: 320,
        prioridad: "ALTA",
        descripcion: "Kits de iluminación para zonas sin electricidad.",
        fechaNecesidad: todayPlus(2),
      },
      {
        nombre: "Cloro / desinfectante",
        categoria: "Productos de limpieza",
        unidad: "litros",
        meta: 2000,
        recibido: 1600,
        prioridad: "BAJA",
        descripcion: "Desinfectante para limpieza de espacios colectivos.",
        fechaNecesidad: todayPlus(7),
      },
    ]);
    console.log(`✅ 8 necesidades iniciales sembradas`);
  } else {
    console.log(`ℹ️  Ya hay necesidades en la BD — no se sembró nada nuevo.`);
  }
} catch (error) {
  console.error("❌ Falló el seed de necesidades:", error);
  process.exit(1);
}

process.exit(0);
