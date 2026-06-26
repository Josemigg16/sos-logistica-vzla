import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { join } from "path";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL no está definida en las variables de entorno.");
}

console.log("🔄 Ejecutando migraciones de base de datos...");

const migrationClient = postgres(databaseUrl, { max: 1 });
const db = drizzle(migrationClient);

try {
  await migrate(db, {
    migrationsFolder: join(import.meta.dir, "migrations"),
  });
  console.log("✅ ¡Todas las migraciones fueron aplicadas con éxito!");
} catch (error) {
  console.error("❌ Error aplicando migraciones:", error);
  process.exit(1);
} finally {
  await migrationClient.end();
}
