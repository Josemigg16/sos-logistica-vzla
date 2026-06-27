import { eq, sql } from "drizzle-orm";
import { db } from "./db";
import { hubs } from "./schema";
import type { HubRepository } from "../../domain/resources/repositories/hub.repository";
import { Hub } from "../../domain/resources/entities/hub";

type HubRow = typeof hubs.$inferSelect;

function toDomain(row: HubRow): Hub {
  return Hub.rehydrate({
    id: row.id,
    name: row.name,
    address: row.address,
    contact: row.contact,
    type: row.type,
    latitude: row.latitude,
    longitude: row.longitude,
    coordinatorId: row.coordinatorId ?? null,
    createdAt: row.createdAt,
  });
}

export class DrizzleHubRepository implements HubRepository {
  async findById(id: string): Promise<Hub | null> {
    const [row] = await db.select().from(hubs).where(eq(hubs.id, id)).limit(1);
    return row ? toDomain(row) : null;
  }

  async findByCoordinator(coordinatorId: string): Promise<Hub | null> {
    const [row] = await db
      .select()
      .from(hubs)
      .where(eq(hubs.coordinatorId, coordinatorId))
      .limit(1);
    return row ? toDomain(row) : null;
  }

  async findAll(): Promise<Hub[]> {
    const rows = await db.select().from(hubs);
    return rows.map(toDomain);
  }

  async save(hub: Hub): Promise<void> {
    const pub = hub.toPublic();
    const values = {
      id: pub.id,
      name: pub.name,
      address: pub.address,
      contact: pub.contact,
      type: pub.type,
      latitude: pub.latitude,
      longitude: pub.longitude,
      coordinatorId: pub.coordinatorId,
      createdAt: new Date(pub.createdAt),
    };
    await db
      .insert(hubs)
      .values(values)
      .onConflictDoUpdate({
        target: hubs.id,
        set: {
          name: values.name,
          address: values.address,
          contact: values.contact,
          type: values.type,
          latitude: values.latitude,
          longitude: values.longitude,
          // Preserva el coordinador si el upsert no trae uno (ej. edición admin).
          coordinatorId: sql`coalesce(${values.coordinatorId}, ${hubs.coordinatorId})`,
        },
      });
  }

  async delete(id: string): Promise<void> {
    await db.delete(hubs).where(eq(hubs.id, id));
  }
}
