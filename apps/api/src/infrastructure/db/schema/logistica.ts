import { pgTable, uuid, text, doublePrecision, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { usuarios, choferes } from "./usuarios";
import { centros, incidentes, lotesCarga, traspasosCarga } from "./carga";

// --- ENUMS ---
export const estadoVehiculoEnum = pgEnum("estado_vehiculo", ["DISPONIBLE", "EN_RUTA", "FUERA_DE_SERVICIO"]);
export const estadoCaravanaEnum = pgEnum("estado_caravana", ["PLANIFICADA", "EN_RUTA", "COMPLETADA", "CANCELADA"]);
export const estadoViajeEnum = pgEnum("estado_viaje", ["PLANIFICADO", "EN_RUTA", "ENTREGADO", "CANCELADO"]);

// --- TABLAS ---

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
  centroOrigenId: uuid("centro_origen_id").references(() => centros.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Caravanas (agrupaciones de vehículos escoltados coordinados bajo emergencia).
 */
export const caravanas = pgTable("caravanas", {
  id: uuid("id").primaryKey().defaultRandom(),
  nombre: text("nombre").notNull(),
  estado: estadoCaravanaEnum("estado").notNull().default("PLANIFICADA"),
  incidenteId: uuid("incidente_id")
    .notNull()
    .references(() => incidentes.id, { onDelete: "cascade" }),
  destinoId: uuid("destino_id")
    .notNull()
    .references(() => centros.id, { onDelete: "restrict" }),
  fechaSalida: timestamp("fecha_salida", { withTimezone: true }),
  fechaEstimadaArribo: timestamp("fecha_estimada_arribo", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Viajes individuales realizados por un vehículo (dentro o fuera de una caravana).
 */
export const viajes = pgTable("viajes", {
  id: uuid("id").primaryKey().defaultRandom(),
  caravanaId: uuid("caravana_id").references(() => caravanas.id, { onDelete: "cascade" }),
  vehiculoId: uuid("vehiculo_id")
    .notNull()
    .references(() => vehiculos.id, { onDelete: "restrict" }),
  estado: estadoViajeEnum("estado").notNull().default("PLANIFICADO"),
  destinoId: uuid("destino_id")
    .notNull()
    .references(() => centros.id, { onDelete: "restrict" }),
  fechaSalida: timestamp("fecha_salida", { withTimezone: true }),
  fechaEstimadaArribo: timestamp("fecha_estimada_arribo", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// --- RELACIONES ---

export const vehiculosRelations = relations(vehiculos, ({ one, many }) => ({
  chofer: one(choferes, {
    fields: [vehiculos.choferId],
    references: [choferes.id],
  }),
  centroOrigen: one(centros, {
    fields: [vehiculos.centroOrigenId],
    references: [centros.id],
  }),
  viajes: many(viajes),
}));

export const caravanasRelations = relations(caravanas, ({ one, many }) => ({
  incidente: one(incidentes, {
    fields: [caravanas.incidenteId],
    references: [incidentes.id],
  }),
  destino: one(centros, {
    fields: [caravanas.destinoId],
    references: [centros.id],
  }),
  viajes: many(viajes),
}));

export const viajesRelations = relations(viajes, ({ one, many }) => ({
  caravana: one(caravanas, {
    fields: [viajes.caravanaId],
    references: [caravanas.id],
  }),
  vehiculo: one(vehiculos, {
    fields: [viajes.vehiculoId],
    references: [vehiculos.id],
  }),
  destino: one(centros, {
    fields: [viajes.destinoId],
    references: [centros.id],
  }),
  lotesCarga: many(lotesCarga),
  traspasosOrigen: many(traspasosCarga, { relationName: "viaje_origen" }),
  traspasosDestino: many(traspasosCarga, { relationName: "viaje_destino" }),
}));
