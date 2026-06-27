import { pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";

/**
 * Configuración global de la aplicación (key-value). Catálogo cerrado de keys
 * definido en `@sos/shared` (`SETTING_KEYS`). Toda key se almacena con su
 * valor como string — el shape se interpreta en la capa de aplicación.
 */
export const appSettings = pgTable("app_settings", {
  key: varchar("key", { length: 64 }).primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
