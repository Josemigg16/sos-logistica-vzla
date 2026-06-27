import {
  doublePrecision,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { INCIDENT_STATUSES, PRIORITIES } from "@sos/shared";

export const priorityEnum = pgEnum("priority", PRIORITIES);
export const incidentStatusEnum = pgEnum("incident_status", INCIDENT_STATUSES);

export const incidents = pgTable("incidents", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: varchar("title", { length: 160 }).notNull(),
  description: text("description").notNull(),
  type: varchar("type", { length: 80 }).notNull(),
  priority: priorityEnum("priority").notNull().default("MEDIUM"),
  status: incidentStatusEnum("status").notNull().default("ACTIVE"),
  zone: varchar("zone", { length: 120 }).notNull(),
  latitude: doublePrecision("latitude").notNull(),
  longitude: doublePrecision("longitude").notNull(),
  // Referencia al usuario que reportó, POR ID. Sin FK dura: `incidents` no se
  // acopla a `identity` a nivel DB — los módulos se comunican por IDs.
  reportedById: uuid("reported_by_id"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
