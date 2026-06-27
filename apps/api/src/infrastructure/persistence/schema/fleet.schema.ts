import { pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

export const tiposVehiculo = pgTable("tipos_vehiculo", {
  id: uuid("id").primaryKey().defaultRandom(),
  nombre: varchar("nombre", { length: 80 }).notNull().unique(),
  descripcion: text("descripcion").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
