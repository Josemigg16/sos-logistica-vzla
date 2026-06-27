import { date, integer, pgEnum, pgTable, timestamp, uuid, varchar, text } from "drizzle-orm/pg-core";
import { PRIORIDADES } from "@sos/shared";
import { inventoryCategoryEnum } from "./resources.schema";

/**
 * Necesidades públicas que muestra el panel principal.
 * Las gestionan ADMIN y ZODI_DESTINATION desde /admin/needs.
 */

export const prioridadEnum = pgEnum("prioridad", PRIORIDADES);

export const needs = pgTable("needs", {
  id: uuid("id").primaryKey().defaultRandom(),
  nombre: varchar("nombre", { length: 160 }).notNull(),
  categoria: inventoryCategoryEnum("categoria").notNull(),
  unidad: varchar("unidad", { length: 40 }).notNull(),
  meta: integer("meta").notNull(),
  recibido: integer("recibido").notNull().default(0),
  prioridad: prioridadEnum("prioridad").notNull(),
  descripcion: text("descripcion").notNull().default(""),
  fechaNecesidad: date("fecha_necesidad").notNull(),
  ultimaActualizacion: timestamp("ultima_actualizacion", { withTimezone: true })
    .notNull()
    .defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
