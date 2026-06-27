import {
  integer,
  pgEnum,
  pgTable,
  timestamp,
  uuid,
  varchar,
  text,
  doublePrecision,
  boolean,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { OPERATION_STATUSES } from "@sos/shared";
import { users } from "./users.schema";
import { incidents } from "./incidents.schema";
import { hubs, lotesCarga, traspasosCarga, resources } from "./resources.schema";

// --- ENUMS ---
export const operationStatusEnum = pgEnum(
  "operation_status",
  OPERATION_STATUSES,
);
export const estadoVehiculoEnum = pgEnum("estado_vehiculo", ["DISPONIBLE", "EN_RUTA", "FUERA_DE_SERVICIO"]);
export const estadoViajeEnum = pgEnum("estado_viaje", ["PLANIFICADO", "EN_RUTA", "ENTREGADO", "CANCELADO"]);

// --- TABLAS ---

/**
 * Tabla que extiende a los usuarios con rol 'DRIVER' para registrar sus datos específicos de chofer.
 */
export const choferes = pgTable("choferes", {
  id: uuid("id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  licencia: text("licencia").notNull(), // Nro de licencia y grado (ej: "Grado 5")
  telefono: text("telefono").notNull(),
  disponible: boolean("disponible").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Operaciones (misiones de respuesta activa, caravanas).
 * Tabla esperada por el repositorio remoto en inglés: 'operations'.
 */
export const operations = pgTable("operations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 160 }).notNull(),
  status: operationStatusEnum("status").notNull().default("PLANNED"),
  // Referencia por ID al contexto `incidents` (Postgres FK)
  incidentId: uuid("incident_id")
    .notNull()
    .references(() => incidents.id, { onDelete: "cascade" }),
  zone: varchar("zone", { length: 120 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/**
 * Vehículos de la flota de ayuda humanitaria.
 */
export const vehiculos = pgTable("vehiculos", {
  id: uuid("id").primaryKey().defaultRandom(),
  placa: text("placa").notNull().unique(),
  modelo: text("modelo").notNull(),
  capacidadCargaKg: doublePrecision("capacidad_carga_kg").notNull(),
  estado: estadoVehiculoEnum("estado").notNull().default("DISPONIBLE"),
  choferId: uuid("chofer_id").references(() => choferes.id, { onDelete: "set null" }),
  centroOrigenId: uuid("centro_origen_id").references(() => hubs.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Viajes individuales realizados por un vehículo dentro de una operación/caravana.
 */
export const viajes = pgTable("viajes", {
  id: uuid("id").primaryKey().defaultRandom(),
  operationId: uuid("operation_id")
    .notNull()
    .references(() => operations.id, { onDelete: "cascade" }),
  vehiculoId: uuid("vehiculo_id")
    .notNull()
    .references(() => vehiculos.id, { onDelete: "restrict" }),
  estado: estadoViajeEnum("estado").notNull().default("PLANIFICADO"),
  destinoId: uuid("destino_id")
    .notNull()
    .references(() => hubs.id, { onDelete: "restrict" }),
  fechaSalida: timestamp("fecha_salida", { withTimezone: true }),
  fechaEstimadaArribo: timestamp("fecha_estimada_arribo", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Asignaciones de recursos a una operación.
 * Tabla esperada por el repositorio remoto en inglés: 'assignments'.
 */
export const assignments = pgTable("assignments", {
  id: uuid("id").primaryKey().defaultRandom(),
  operationId: uuid("operation_id")
    .notNull()
    .references(() => operations.id, { onDelete: "cascade" }),
  resourceId: uuid("resource_id")
    .notNull()
    .references(() => resources.id, { onDelete: "restrict" }),
  quantity: integer("quantity").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// --- RELACIONES (Drizzle Relations) ---

export const choferesRelations = relations(choferes, ({ one, many }) => ({
  usuario: one(users, {
    fields: [choferes.id],
    references: [users.id],
  }),
  vehiculosAsignados: many(vehiculos),
}));

export const operationsRelations = relations(operations, ({ one, many }) => ({
  incidente: one(incidents, {
    fields: [operations.incidentId],
    references: [incidents.id],
  }),
  assignments: many(assignments),
  viajes: many(viajes),
}));

export const vehiculosRelations = relations(vehiculos, ({ one, many }) => ({
  chofer: one(choferes, {
    fields: [vehiculos.choferId],
    references: [choferes.id],
  }),
  centroOrigen: one(hubs, {
    fields: [vehiculos.centroOrigenId],
    references: [hubs.id],
  }),
  viajes: many(viajes),
}));

export const viajesRelations = relations(viajes, ({ one, many }) => ({
  operacion: one(operations, {
    fields: [viajes.operationId],
    references: [operations.id],
  }),
  vehiculo: one(vehiculos, {
    fields: [viajes.vehiculoId],
    references: [vehiculos.id],
  }),
  destino: one(hubs, {
    fields: [viajes.destinoId],
    references: [hubs.id],
  }),
  lotesCarga: many(lotesCarga),
  traspasosOrigen: many(traspasosCarga, { relationName: "viaje_origen" }),
  traspasosDestino: many(traspasosCarga, { relationName: "viaje_destino" }),
}));

export const assignmentsRelations = relations(assignments, ({ one }) => ({
  operation: one(operations, {
    fields: [assignments.operationId],
    references: [operations.id],
  }),
  resource: one(resources, {
    fields: [assignments.resourceId],
    references: [resources.id],
  }),
}));
