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
import { products, hubs } from "./schema/resources.schema";
import { tiposVehiculo } from "./schema/fleet.schema";
import { choferes, vehiculos } from "./schema/operations.schema";
import { lotes, loteItems } from "./schema/cargo.schema";
import { PRODUCT_MASTER } from "@sos/shared";

const username = process.env.SEED_ADMIN_USER ?? "admin";
const password = process.env.SEED_ADMIN_PASS ?? "changeme123";

const registerUser = new RegisterUser(
  new DrizzleUserRepository(),
  new BunPasswordHasher(),
);

// 1. Sembrar el administrador
try {
  const user = await registerUser.execute({ telefono: username, password, role: "ADMIN" } as any);
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

// --- SECCIÓN DE DATOS DE PRUEBA Y DESARROLLO ---
// Si estamos en un entorno de producción real, evitamos sembrar datos ficticios que enbasuren la base de datos.
if (process.env.NODE_ENV === "production" || process.env.SEED_DUMMY_DATA === "false") {
  console.log("ℹ️  Entorno de producción o flag SEED_DUMMY_DATA=false detectado. Omitiendo sembrado de datos ficticios (hubs, choferes, vehículos y lotes).");
  process.exit(0);
}

// 4. Sembrar centros de acopio (Hubs) de prueba
try {
  console.log("⏳ Sembrando centros de acopio de prueba...");
  // Acopio Periférico (COLLECTION)
  await db
    .insert(hubs)
    .values({
      id: "44444444-4444-4444-4444-444444444441",
      name: "Acopio Periférico Norte",
      address: "Av. Principal de Catia, Sector Norte, Caracas",
      contact: "0412-9998877",
      type: "COLLECTION",
      latitude: 10.5012,
      longitude: -66.9312,
    })
    .onConflictDoUpdate({
      target: hubs.id,
      set: {
        name: "Acopio Periférico Norte",
        address: "Av. Principal de Catia, Sector Norte, Caracas",
        contact: "0412-9998877",
        type: "COLLECTION",
      },
    });

  // Centro de Destino / Llegada (DESTINATION)
  await db
    .insert(hubs)
    .values({
      id: "44444444-4444-4444-4444-444444444442",
      name: "Centro de Entrega Final La Guaira",
      address: "Puerto de La Guaira, Muelle Bravo, La Guaira",
      contact: "0424-5556677",
      type: "DESTINATION",
      latitude: 10.6012,
      longitude: -66.9312,
    })
    .onConflictDoUpdate({
      target: hubs.id,
      set: {
        name: "Centro de Entrega Final La Guaira",
        address: "Puerto de La Guaira, Muelle Bravo, La Guaira",
        contact: "0424-5556677",
        type: "DESTINATION",
      },
    });

  // Base General ZODI Portuguesa (centro de destino/llegada)
  await db
    .insert(hubs)
    .values({
      id: "44444444-4444-4444-4444-444444444443",
      name: "Base General ZODI Portuguesa",
      address: "Fuerte Los Teques, Sector Comando ZODI, Portuguesa",
      contact: "0416-8889900",
      type: "DESTINATION",
      latitude: 9.0012,
      longitude: -69.0012,
    })
    .onConflictDoUpdate({
      target: hubs.id,
      set: {
        name: "Base General ZODI Portuguesa",
        address: "Fuerte Los Teques, Sector Comando ZODI, Portuguesa",
        contact: "0416-8889900",
        type: "DESTINATION",
      },
    });
  console.log("✅ Centros de acopio (Periférico, Destino y ZODI) sembrados.");
} catch (error) {
  console.error("❌ Falló el seed de centros de acopio:", error);
  process.exit(1);
}

// 5. Sembrar tipos de vehículo (Carga y Transporte)
try {
  console.log("⏳ Sembrando tipos de vehículo...");
  await db
    .insert(tiposVehiculo)
    .values({
      id: "11111111-1111-1111-1111-111111111111",
      nombre: "Carga y Transporte",
      descripcion: "Vehículos dedicados al transporte y carga de insumos humanitarios.",
    })
    .onConflictDoUpdate({
      target: tiposVehiculo.id,
      set: {
        nombre: "Carga y Transporte",
        descripcion: "Vehículos dedicados al transporte y carga de insumos humanitarios.",
      },
    });
  console.log("✅ Tipo de vehículo 'Carga y Transporte' sembrado.");
} catch (error) {
  console.error("❌ Falló el seed de tipos de vehículo:", error);
  process.exit(1);
}

// 6. Sembrar choferes de prueba
try {
  console.log("⏳ Sembrando choferes de prueba...");
  await db
    .insert(choferes)
    .values({
      id: "22222222-2222-2222-2222-222222222221",
      nombre: "Juan",
      apellido: "Pérez",
      cedula: "V-12345678",
      licencia: "De Quinta (Profesional)",
      telefono: "0412-1112233",
      disponible: true,
    })
    .onConflictDoNothing();
  await db
    .insert(choferes)
    .values({
      id: "22222222-2222-2222-2222-222222222222",
      nombre: "Carlos",
      apellido: "Gómez",
      cedula: "V-87654321",
      licencia: "De Quinta (Profesional)",
      telefono: "0424-4445566",
      disponible: true,
    })
    .onConflictDoNothing();
  console.log("✅ Choferes de prueba sembrados.");
} catch (error) {
  console.error("❌ Falló el seed de choferes:", error);
  process.exit(1);
}

// 7. Sembrar vehículos de prueba
try {
  console.log("⏳ Sembrando vehículos de prueba...");
  await db
    .insert(vehiculos)
    .values({
      id: "33333333-3333-3333-3333-333333333331",
      placa: "A12BC3D",
      modelo: "Camión JAC Sunray",
      capacidadCargaKg: 3500,
      estado: "DISPONIBLE",
      choferId: "22222222-2222-2222-2222-222222222221",
      tipoVehiculoId: "11111111-1111-1111-1111-111111111111",
    })
    .onConflictDoNothing();
  await db
    .insert(vehiculos)
    .values({
      id: "33333333-3333-3333-3333-333333333332",
      placa: "X98YZ7W",
      modelo: "Gandola Mack Granite",
      capacidadCargaKg: 18000,
      estado: "DISPONIBLE",
      choferId: "22222222-2222-2222-2222-222222222222",
      tipoVehiculoId: "11111111-1111-1111-1111-111111111111",
    })
    .onConflictDoNothing();
  console.log("✅ Vehículos de prueba sembrados.");
} catch (error) {
  console.error("❌ Falló el seed de vehículos:", error);
  process.exit(1);
}

// 8. Sembrar lotes de prueba
try {
  console.log("⏳ Sembrando lotes de prueba...");
  // Lote 1 (Embalado en Acopio Periférico Norte con destino a Entrega Final La Guaira)
  await db
    .insert(lotes)
    .values({
      id: "55555555-5555-5555-5555-555555555551",
      hubOrigenId: "44444444-4444-4444-4444-444444444441",
      hubDestinoId: "44444444-4444-4444-4444-444444444442",
      estado: "EMBALADO",
      nota: "Suministros médicos y agua de emergencia",
      pesoTotalKg: 150,
    })
    .onConflictDoNothing();

  await db
    .insert(loteItems)
    .values({
      id: "66666666-6666-6666-6666-666666666611",
      loteId: "55555555-5555-5555-5555-555555555551",
      productId: "00000000-0000-0000-0001-000000000001", // Agua
      cantidad: 100,
      pesoKg: 100,
    })
    .onConflictDoNothing();

  await db
    .insert(loteItems)
    .values({
      id: "66666666-6666-6666-6666-666666666612",
      loteId: "55555555-5555-5555-5555-555555555551",
      productId: "00000000-0000-0000-0001-000000000002", // Arroz
      cantidad: 50,
      pesoKg: 50,
    })
    .onConflictDoNothing();

  // Lote 2 (Embalado en Acopio Periférico Norte con destino a Base ZODI Portuguesa)
  await db
    .insert(lotes)
    .values({
      id: "55555555-5555-5555-5555-555555555552",
      hubOrigenId: "44444444-4444-4444-4444-444444444441",
      hubDestinoId: "44444444-4444-4444-4444-444444444443",
      estado: "EMBALADO",
      nota: "Víveres secos (Harina)",
      pesoTotalKg: 200,
    })
    .onConflictDoNothing();

  await db
    .insert(loteItems)
    .values({
      id: "66666666-6666-6666-6666-666666666621",
      loteId: "55555555-5555-5555-5555-555555555552",
      productId: "00000000-0000-0000-0001-000000000003", // Harina
      cantidad: 200,
      pesoKg: 200,
    })
    .onConflictDoNothing();

  // Lote 3 (En tránsito, ya asignado al Camión JAC Sunray)
  await db
    .insert(lotes)
    .values({
      id: "55555555-5555-5555-5555-555555555553",
      hubOrigenId: "44444444-4444-4444-4444-444444444441",
      hubDestinoId: "44444444-4444-4444-4444-444444444442",
      vehiculoId: "33333333-3333-3333-3333-333333333331", // Asignado a Camión JAC
      estado: "EN_TRANSITO",
      nota: "Pasta para refugios de La Guaira",
      pesoTotalKg: 300,
    })
    .onConflictDoNothing();

  await db
    .insert(loteItems)
    .values({
      id: "66666666-6666-6666-6666-666666666631",
      loteId: "55555555-5555-5555-5555-555555555553",
      productId: "00000000-0000-0000-0001-000000000004", // Pasta
      cantidad: 300,
      pesoKg: 300,
    })
    .onConflictDoNothing();

  console.log("✅ Lotes de prueba y sus items sembrados.");
} catch (error) {
  console.error("❌ Falló el seed de lotes de prueba:", error);
  process.exit(1);
}

process.exit(0);
