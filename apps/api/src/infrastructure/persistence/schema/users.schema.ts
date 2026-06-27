import {
  boolean,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { ROLES, USER_STATUSES } from "@sos/shared";
import { hubs, historialCarga, traspasosCarga } from "./resources.schema";
import { incidents } from "./incidents.schema";

export const roleEnum = pgEnum("role", ROLES);
export const userStatusEnum = pgEnum("user_status", USER_STATUSES);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  username: varchar("username", { length: 64 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: roleEnum("role").notNull(),
  status: userStatusEnum("status").notNull().default("ACTIVE"),
  email: varchar("email", { length: 255 }),
  cedula: varchar("cedula", { length: 20 }).unique(),
  telefono: varchar("telefono", { length: 20 }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const usersRelations = relations(users, ({ many }) => ({
  centrosResponsable: many(hubs),
  incidentesReportados: many(incidents),
  historialAcciones: many(historialCarga),
  traspasosAutorizados: many(traspasosCarga),
}));
