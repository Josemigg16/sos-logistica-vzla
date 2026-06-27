import {
  doublePrecision,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { estadoLoteEnum } from "./resources.schema";
import { hubs, products } from "./resources.schema";
import { vehiculos } from "./operations.schema";
import { users } from "./users.schema";

export const lotes = pgTable("lotes", {
  id: uuid("id").primaryKey().defaultRandom(),
  hubOrigenId: uuid("hub_origen_id")
    .notNull()
    .references(() => hubs.id, { onDelete: "restrict" }),
  hubDestinoId: uuid("hub_destino_id")
    .references(() => hubs.id, { onDelete: "set null" }),
  vehiculoId: uuid("vehiculo_id")
    .references(() => vehiculos.id, { onDelete: "set null" }),
  convoyId: uuid("convoy_id"),
  estado: estadoLoteEnum("estado").notNull().default("EMBALADO"),
  nota: text("nota"),
  pesoTotalKg: doublePrecision("peso_total_kg").notNull().default(0),
  creadoPorId: uuid("creado_por_id")
    .references(() => users.id, { onDelete: "set null" }),
  confirmadoPorId: uuid("confirmado_por_id")
    .references(() => users.id, { onDelete: "set null" }),
  confirmadoEn: timestamp("confirmado_en", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const loteItems = pgTable("lote_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  loteId: uuid("lote_id")
    .notNull()
    .references(() => lotes.id, { onDelete: "cascade" }),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "restrict" }),
  cantidad: integer("cantidad").notNull(),
  pesoKg: doublePrecision("peso_kg"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const loteTraspasos = pgTable("lote_traspasos", {
  id: uuid("id").primaryKey().defaultRandom(),
  loteId: uuid("lote_id")
    .notNull()
    .references(() => lotes.id, { onDelete: "cascade" }),
  vehiculoOrigenId: uuid("vehiculo_origen_id")
    .references(() => vehiculos.id, { onDelete: "set null" }),
  vehiculoDestinoId: uuid("vehiculo_destino_id")
    .notNull()
    .references(() => vehiculos.id, { onDelete: "restrict" }),
  motivo: text("motivo").notNull().default(""),
  autorizadoPorId: uuid("autorizado_por_id")
    .references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// --- RELACIONES ---

export const lotesRelations = relations(lotes, ({ one, many }) => ({
  hubOrigen: one(hubs, { fields: [lotes.hubOrigenId], references: [hubs.id] }),
  hubDestino: one(hubs, { fields: [lotes.hubDestinoId], references: [hubs.id] }),
  vehiculo: one(vehiculos, { fields: [lotes.vehiculoId], references: [vehiculos.id] }),
  creadoPor: one(users, { fields: [lotes.creadoPorId], references: [users.id] }),
  items: many(loteItems),
  traspasos: many(loteTraspasos),
}));

export const loteItemsRelations = relations(loteItems, ({ one }) => ({
  lote: one(lotes, { fields: [loteItems.loteId], references: [lotes.id] }),
  product: one(products, { fields: [loteItems.productId], references: [products.id] }),
}));

export const loteTraspasosRelations = relations(loteTraspasos, ({ one }) => ({
  lote: one(lotes, { fields: [loteTraspasos.loteId], references: [lotes.id] }),
  vehiculoOrigen: one(vehiculos, { fields: [loteTraspasos.vehiculoOrigenId], references: [vehiculos.id] }),
  vehiculoDestino: one(vehiculos, { fields: [loteTraspasos.vehiculoDestinoId], references: [vehiculos.id] }),
  autorizadoPor: one(users, { fields: [loteTraspasos.autorizadoPorId], references: [users.id] }),
}));
