import {
  doublePrecision,
  integer,
  pgEnum,
  pgTable,
  timestamp,
  uuid,
  varchar,
  text,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { HUB_TYPES, INVENTORY_CATEGORIES } from "@sos/shared";
import { users } from "./users.schema";
import { viajes, vehiculos, operations } from "./operations.schema";

// --- ENUMS ---
export const hubTypeEnum = pgEnum("hub_type", HUB_TYPES);
export const inventoryCategoryEnum = pgEnum("inventory_category", INVENTORY_CATEGORIES);
export const estadoLoteEnum = pgEnum("estado_lote", ["EMBALADO", "EN_TRANSITO", "ENTREGADO"]);
export const accionCargaEnum = pgEnum("accion_carga", ["RECEPCION", "EMBALAJE", "DESPACHO", "ENTREGA", "TRASPASO"]);

// --- TABLAS ---

/**
 * Catálogo Maestro de Productos en la Base de Datos.
 */
export const products = pgTable("products", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 160 }).notNull().unique(),
  category: inventoryCategoryEnum("category").notNull(),
  unit: varchar("unit", { length: 40 }).notNull(),
  description: text("description").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const needs = pgTable("needs", {
  id: uuid("id").primaryKey().defaultRandom(),
  hubId: uuid("hub_id")
    .notNull()
    .references(() => hubs.id, { onDelete: "cascade" }),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  meta: integer("meta").notNull().default(0),
  recibido: integer("recibido").notNull().default(0),
  prioridad: varchar("prioridad", { length: 20 }).notNull().default("ALTA"),
  descripcion: text("descripcion").default(""),
  fechaNecesidad: timestamp("fecha_necesidad", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Centros de acopio periféricos, de salida (Protección Civil) y destinos finales.
 * Tabla esperada por el repositorio remoto en inglés: 'hubs'.
 */
export const hubs = pgTable("hubs", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 160 }).notNull(),
  address: varchar("address", { length: 255 }).notNull(),
  contact: varchar("contact", { length: 120 }).notNull(),
  type: hubTypeEnum("type").notNull(),
  latitude: doublePrecision("latitude").notNull(),
  longitude: doublePrecision("longitude").notNull(),
  coordinatorId: uuid("coordinator_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/**
 * Recursos / Suministros humanitarios almacenados en cada Hub.
 * Tabla esperada por el repositorio remoto en inglés: 'resources'.
 */
export const resources = pgTable("resources", {
  id: uuid("id").primaryKey().defaultRandom(),
  hubId: uuid("hub_id")
    .notNull()
    .references(() => hubs.id, { onDelete: "cascade" }),
  category: inventoryCategoryEnum("category").notNull(),
  quantity: integer("quantity").notNull().default(0),
  unit: varchar("unit", { length: 40 }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/**
 * Lotes de carga embalados en tránsito dentro de un viaje de transporte.
 */
export const lotesCarga = pgTable("lotes_carga", {
  id: uuid("id").primaryKey().defaultRandom(),
  viajeId: uuid("viaje_id")
    .notNull()
    .references(() => viajes.id, { onDelete: "cascade" }),
  categoria: text("categoria").notNull(),
  cantidad: integer("cantidad").notNull(),
  estado: estadoLoteEnum("estado").notNull().default("EMBALADO"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Registro de traspasos de lotes de carga entre viajes (vehículos).
 */
export const traspasosCarga = pgTable("traspasos_carga", {
  id: uuid("id").primaryKey().defaultRandom(),
  loteCargaId: uuid("lote_carga_id")
    .notNull()
    .references(() => lotesCarga.id, { onDelete: "cascade" }),
  viajeOrigenId: uuid("viaje_origen_id")
    .notNull()
    .references(() => viajes.id, { onDelete: "restrict" }),
  viajeDestinoId: uuid("viaje_destino_id")
    .notNull()
    .references(() => viajes.id, { onDelete: "restrict" }),
  autorizadoPorId: uuid("autorizado_por_id").references(() => users.id, { onDelete: "set null" }),
  motivo: text("motivo").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Historial de movimientos de carga para auditoría y control de tiempos.
 */
export const historialCarga = pgTable("historial_carga", {
  id: uuid("id").primaryKey().defaultRandom(),
  centroId: uuid("centro_id").references(() => hubs.id, { onDelete: "set null" }),
  loteCargaId: uuid("lote_carga_id").references(() => lotesCarga.id, { onDelete: "set null" }),
  accion: accionCargaEnum("accion").notNull(),
  cantidad: integer("cantidad").notNull(),
  descripcion: text("descripcion"),
  realizadoPorId: uuid("realizado_por_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// --- RELACIONES (Drizzle Relations) ---

export const hubsRelations = relations(hubs, ({ many }) => ({
  resources: many(resources),
  needs: many(needs),
  vehiculosUbicados: many(vehiculos),
  operationsDestino: many(operations),
  viajesDestino: many(viajes),
  historialAcciones: many(historialCarga),
}));

export const needsRelations = relations(needs, ({ one }) => ({
  hub: one(hubs, {
    fields: [needs.hubId],
    references: [hubs.id],
  }),
  product: one(products, {
    fields: [needs.productId],
    references: [products.id],
  }),
}));

export const resourcesRelations = relations(resources, ({ one }) => ({
  hub: one(hubs, {
    fields: [resources.hubId],
    references: [hubs.id],
  }),
}));

export const lotesCargaRelations = relations(lotesCarga, ({ one, many }) => ({
  viaje: one(viajes, {
    fields: [lotesCarga.viajeId],
    references: [viajes.id],
  }),
  historial: many(historialCarga),
  traspasos: many(traspasosCarga),
}));

export const traspasosCargaRelations = relations(traspasosCarga, ({ one }) => ({
  loteCarga: one(lotesCarga, {
    fields: [traspasosCarga.loteCargaId],
    references: [lotesCarga.id],
  }),
  viajeOrigen: one(viajes, {
    fields: [traspasosCarga.viajeOrigenId],
    references: [viajes.id],
    relationName: "viaje_origen",
  }),
  viajeDestino: one(viajes, {
    fields: [traspasosCarga.viajeDestinoId],
    references: [viajes.id],
    relationName: "viaje_destino",
  }),
  autorizadoPor: one(users, {
    fields: [traspasosCarga.autorizadoPorId],
    references: [users.id],
  }),
}));

export const historialCargaRelations = relations(historialCarga, ({ one }) => ({
  centro: one(hubs, {
    fields: [historialCarga.centroId],
    references: [hubs.id],
  }),
  loteCarga: one(lotesCarga, {
    fields: [historialCarga.loteCargaId],
    references: [lotesCarga.id],
  }),
  realizadoPor: one(users, {
    fields: [historialCarga.realizadoPorId],
    references: [users.id],
  }),
}));
