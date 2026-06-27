import { relations } from "drizzle-orm";
import {
  pgEnum,
  pgTable,
  primaryKey,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { CONVOY_STATUSES } from "@sos/shared";
import { vehiculos } from "./operations.schema";
import { hubs } from "./resources.schema";

export const convoyStatusEnum = pgEnum("convoy_status", CONVOY_STATUSES);

export const convoys = pgTable("convoys", {
  id: uuid("id").primaryKey().defaultRandom(),
  origenId: uuid("origen_id")
    .notNull()
    .references(() => hubs.id, { onDelete: "restrict" }),
  destinoId: uuid("destino_id")
    .notNull()
    .references(() => hubs.id, { onDelete: "restrict" }),
  escoltaNombre: varchar("escolta_nombre", { length: 100 }).notNull(),
  escoltaCedula: varchar("escolta_cedula", { length: 20 }),
  status: convoyStatusEnum("status").notNull().default("PLANIFICADO"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const convoyVehicles = pgTable(
  "convoy_vehicles",
  {
    convoyId: uuid("convoy_id")
      .notNull()
      .references(() => convoys.id, { onDelete: "cascade" }),
    vehicleId: uuid("vehicle_id")
      .notNull()
      .references(() => vehiculos.id, { onDelete: "restrict" }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.convoyId, table.vehicleId] }),
  }),
);

export const convoysRelations = relations(convoys, ({ one, many }) => ({
  origen: one(hubs, { fields: [convoys.origenId], references: [hubs.id] }),
  destino: one(hubs, { fields: [convoys.destinoId], references: [hubs.id] }),
  vehicles: many(convoyVehicles),
}));

export const convoyVehiclesRelations = relations(convoyVehicles, ({ one }) => ({
  convoy: one(convoys, {
    fields: [convoyVehicles.convoyId],
    references: [convoys.id],
  }),
  vehicle: one(vehiculos, {
    fields: [convoyVehicles.vehicleId],
    references: [vehiculos.id],
  }),
}));
