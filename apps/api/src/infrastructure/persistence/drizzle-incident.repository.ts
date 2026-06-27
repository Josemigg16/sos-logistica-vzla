import { eq } from "drizzle-orm";
import { db } from "./db";
import { incidents } from "./schema";
import type { IncidentRepository } from "../../domain/incidents/repositories/incident.repository";
import { Incident } from "../../domain/incidents/entities/incident";
import { Priority } from "../../domain/incidents/value-objects/priority";

type IncidentRow = typeof incidents.$inferSelect;

function toDomain(row: IncidentRow): Incident {
  return Incident.rehydrate({
    id: row.id,
    title: row.title,
    description: row.description,
    type: row.type,
    priority: Priority.create(row.priority),
    status: row.status,
    zone: row.zone,
    latitude: row.latitude,
    longitude: row.longitude,
    reportedById: row.reportedById,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
}

export class DrizzleIncidentRepository implements IncidentRepository {
  async findById(id: string): Promise<Incident | null> {
    const [row] = await db
      .select()
      .from(incidents)
      .where(eq(incidents.id, id))
      .limit(1);
    return row ? toDomain(row) : null;
  }

  async findAll(): Promise<Incident[]> {
    const rows = await db.select().from(incidents);
    return rows.map(toDomain);
  }

  async save(incident: Incident): Promise<void> {
    const pub = incident.toPublic();
    const values = {
      id: pub.id,
      title: pub.title,
      description: pub.description,
      type: pub.type,
      priority: pub.priority,
      status: pub.status,
      zone: pub.zone,
      latitude: pub.latitude,
      longitude: pub.longitude,
      reportedById: pub.reportedById,
      createdAt: new Date(pub.createdAt),
      updatedAt: new Date(pub.updatedAt),
    };
    await db
      .insert(incidents)
      .values(values)
      .onConflictDoUpdate({
        target: incidents.id,
        set: {
          title: values.title,
          description: values.description,
          type: values.type,
          priority: values.priority,
          status: values.status,
          zone: values.zone,
          latitude: values.latitude,
          longitude: values.longitude,
          reportedById: values.reportedById,
          updatedAt: values.updatedAt,
        },
      });
  }
}
