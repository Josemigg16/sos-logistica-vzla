import {
  doublePrecision,
  integer,
  pgEnum,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { HUB_TYPES, INVENTORY_CATEGORIES } from "@sos/shared";

export const hubTypeEnum = pgEnum("hub_type", HUB_TYPES);
export const inventoryCategoryEnum = pgEnum(
  "inventory_category",
  INVENTORY_CATEGORIES,
);

export const hubs = pgTable("hubs", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 160 }).notNull(),
  address: varchar("address", { length: 255 }).notNull(),
  contact: varchar("contact", { length: 120 }).notNull(),
  type: hubTypeEnum("type").notNull(),
  latitude: doublePrecision("latitude").notNull(),
  longitude: doublePrecision("longitude").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const resources = pgTable("resources", {
  id: uuid("id").primaryKey().defaultRandom(),
  // FK intra-contexto: Resource pertenece a un Hub del mismo módulo `resources`.
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
