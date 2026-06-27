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
import { products } from "./schema/resources.schema";
import { PRODUCT_MASTER } from "@sos/shared";

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

// 3. Sembrar catálogo de productos
try {
  console.log(`⏳ Sembrando ${PRODUCT_MASTER.length} productos en la base de datos...`);
  for (const prod of PRODUCT_MASTER) {
    await db
      .insert(products)
      .values({
        id: prod.id,
        name: prod.name,
        category: prod.category as any,
        unit: prod.unit,
        description: prod.description,
      })
      .onConflictDoUpdate({
        target: products.id,
        set: {
          name: prod.name,
          category: prod.category as any,
          unit: prod.unit,
          description: prod.description,
        },
      });
  }
  console.log(`✅ Catálogo maestro de productos sembrado exitosamente.`);
} catch (error) {
  console.error("❌ Falló el seed de productos:", error);
  process.exit(1);
}

process.exit(0);
