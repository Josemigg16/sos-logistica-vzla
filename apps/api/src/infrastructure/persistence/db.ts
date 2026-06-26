import { drizzle } from "drizzle-orm/bun-sql";
import { config } from "../../config";
import * as schema from "./schema";

/**
 * Conexión a Postgres vía el driver nativo de Bun (Bun.sql).
 * Bun conecta de forma perezosa en la primera query.
 */
export const db = drizzle(config.databaseUrl, { schema });
