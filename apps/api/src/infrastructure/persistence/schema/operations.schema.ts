import {
  integer,
  pgEnum,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { OPERATION_STATUSES } from "@sos/shared";

export const operationStatusEnum = pgEnum(
  "operation_status",
  OPERATION_STATUSES,
);

export const operations = pgTable("operations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 160 }).notNull(),
  status: operationStatusEnum("status").notNull().default("PLANNED"),
  // Referencia por ID al contexto `incidents`. Sin FK dura: no se acopla.
  incidentId: uuid("incident_id").notNull(),
  zone: varchar("zone", { length: 120 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const assignments = pgTable("assignments", {
  id: uuid("id").primaryKey().defaultRandom(),
  // FK intra-contexto: la asignación pertenece a una operación del mismo módulo.
  operationId: uuid("operation_id")
    .notNull()
    .references(() => operations.id, { onDelete: "cascade" }),
  // Referencia por ID al contexto `resources`. Sin FK dura.
  resourceId: uuid("resource_id").notNull(),
  quantity: integer("quantity").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
