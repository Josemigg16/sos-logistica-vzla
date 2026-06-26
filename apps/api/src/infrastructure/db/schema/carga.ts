import { pgTable, uuid, text, integer, doublePrecision, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { usuarios } from "./usuarios";
import { caravanas, viajes, vehiculos } from "./logistica";

// --- ENUMS ---
export const tipoCentroEnum = pgEnum("tipo_centro", ["acopio", "salida", "destino"]);
export const prioridadEnum = pgEnum("prioridad", ["CRITICA", "ALTA", "MEDIA", "BAJA"]);
export const estadoIncidenteEnum = pgEnum("estado_incidente", ["activo", "controlado", "cerrado"]);
export const estadoLoteEnum = pgEnum("estado_lote", ["EMBALADO", "EN_TRANSITO", "ENTREGADO"]);
// Agregada la acción de "TRASPASO" para trazabilidad de carga en ruta
export const accionCargaEnum = pgEnum("accion_carga", ["RECEPCION", "EMBALAJE", "DESPACHO", "ENTREGA", "TRASPASO"]);

// --- TABLAS ---

/**
 * Centros de acopio periféricos, de salida (Protección Civil) y destinos finales.
 */
export const centros = pgTable("centros", {
  id: uuid("id").primaryKey().defaultRandom(),
  nombre: text("nombre").notNull(),
  direccion: text("direccion").notNull(),
  contacto: text("contacto").notNull(),
  responsableId: uuid("responsable_id").references(() => usuarios.id, { onDelete: "set null" }),
  latitud: doublePrecision("latitud").notNull(),
  longitud: doublePrecision("longitud").notNull(),
  tipo: tipoCentroEnum("tipo").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Incidentes de desastre natural activos.
 */
export const incidentes = pgTable("incidentes", {
  id: uuid("id").primaryKey().defaultRandom(),
  titulo: text("titulo").notNull(),
  descripcion: text("descripcion").notNull(),
  tipo: text("tipo").notNull(), // Ej: Terremoto, Inundacion, Deslizamiento
  estado: estadoIncidenteEnum("estado").notNull().default("activo"),
  prioridad: prioridadEnum("prioridad").notNull().default("MEDIA"),
  zona: text("zona").notNull(), // Área afectada (ej. "La Guaira")
  latitud: doublePrecision("latitud").notNull(),
  longitud: doublePrecision("longitud").notNull(),
  reportadoPorId: uuid("reportado_por_id").references(() => usuarios.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Inventarios en cada centro físico categorizados según catálogo oficial.
 */
export const inventarios = pgTable("inventarios", {
  id: uuid("id").primaryKey().defaultRandom(),
  centroId: uuid("centro_id")
    .notNull()
    .references(() => centros.id, { onDelete: "cascade" }),
  // Categorías de inventario (Víveres, Herramientas, Higiene personal, Medicamentos, etc.)
  categoria: text("categoria").notNull(),
  cantidad: integer("cantidad").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
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
  autorizadoPorId: uuid("autorizado_por_id").references(() => usuarios.id, { onDelete: "set null" }),
  motivo: text("motivo").notNull(), // Ej: "Falla mecánica del vehículo A"
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Historial de movimientos de carga para auditoría y control de tiempos.
 */
export const historialCarga = pgTable("historial_carga", {
  id: uuid("id").primaryKey().defaultRandom(),
  centroId: uuid("centro_id").references(() => centros.id, { onDelete: "set null" }),
  loteCargaId: uuid("lote_carga_id").references(() => lotesCarga.id, { onDelete: "set null" }),
  accion: accionCargaEnum("accion").notNull(),
  cantidad: integer("cantidad").notNull(),
  descripcion: text("descripcion"),
  realizadoPorId: uuid("realizado_por_id").references(() => usuarios.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// --- RELACIONES ---

export const centrosRelations = relations(centros, ({ one, many }) => ({
  responsable: one(usuarios, {
    fields: [centros.responsableId],
    references: [usuarios.id],
  }),
  inventarios: many(inventarios),
  vehiculosUbicados: many(vehiculos),
  caravanasDestino: many(caravanas),
  viajesDestino: many(viajes),
  historialAcciones: many(historialCarga),
}));

export const incidentesRelations = relations(incidentes, ({ one, many }) => ({
  reportadoPor: one(usuarios, {
    fields: [incidentes.reportadoPorId],
    references: [usuarios.id],
  }),
  caravanas: many(caravanas),
}));

export const inventariosRelations = relations(inventarios, ({ one }) => ({
  centro: one(centros, {
    fields: [inventarios.centroId],
    references: [centros.id],
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
  autorizadoPor: one(usuarios, {
    fields: [traspasosCarga.autorizadoPorId],
    references: [usuarios.id],
  }),
}));

export const historialCargaRelations = relations(historialCarga, ({ one }) => ({
  centro: one(centros, {
    fields: [historialCarga.centroId],
    references: [centros.id],
  }),
  loteCarga: one(lotesCarga, {
    fields: [historialCarga.loteCargaId],
    references: [lotesCarga.id],
  }),
  realizadoPor: one(usuarios, {
    fields: [historialCarga.realizadoPorId],
    references: [usuarios.id],
  }),
}));
