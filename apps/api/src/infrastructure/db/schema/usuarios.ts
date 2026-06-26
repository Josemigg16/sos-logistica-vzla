import { pgTable, uuid, text, timestamp, pgEnum, boolean } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { vehiculos } from "./logistica";
import { centros, incidentes, historialCarga, traspasosCarga } from "./carga";

// --- ENUMS ---
export const rolEnum = pgEnum("rol", ["admin", "responsable", "chofer", "voluntario"]);

// --- TABLAS ---
export const usuarios = pgTable("usuarios", {
  id: uuid("id").primaryKey().defaultRandom(),
  nombre: text("nombre").notNull(),
  email: text("email").notNull().unique(),
  rol: rolEnum("rol").notNull().default("voluntario"),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Tabla que extiende a los usuarios con rol 'chofer' para registrar sus datos específicos.
 */
export const choferes = pgTable("choferes", {
  id: uuid("id").primaryKey().references(() => usuarios.id, { onDelete: "cascade" }),
  licencia: text("licencia").notNull(), // Nro de licencia, tipo de licencia (ej: "Grado 5")
  telefono: text("telefono").notNull(),
  disponible: boolean("disponible").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// --- RELACIONES ---

export const usuariosRelations = relations(usuarios, ({ one, many }) => ({
  choferPerfil: one(choferes, {
    fields: [usuarios.id],
    references: [choferes.id],
  }),
  centrosResponsable: many(centros),
  incidentesReportados: many(incidentes),
  historialAcciones: many(historialCarga),
  traspasosAutorizados: many(traspasosCarga),
}));

export const choferesRelations = relations(choferes, ({ one, many }) => ({
  usuario: one(usuarios, {
    fields: [choferes.id],
    references: [usuarios.id],
  }),
  vehiculosAsignados: many(vehiculos), // Chofer puede tener vehículos asociados
}));
