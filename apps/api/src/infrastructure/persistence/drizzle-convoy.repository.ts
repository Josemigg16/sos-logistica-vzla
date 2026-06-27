import type { ConvoyStatus } from "@sos/shared";
import { eq, inArray } from "drizzle-orm";
import { Convoy } from "../../domain/convoys/entities/convoy";
import type { ConvoyRepository } from "../../domain/convoys/repositories/convoy.repository";
import { db } from "./db";
import { convoys, convoyVehicles } from "./schema";

type ConvoyRow = typeof convoys.$inferSelect;
type ConvoyVehicleRow = typeof convoyVehicles.$inferSelect;

function toDomain(row: ConvoyRow, vehicleIds: string[]): Convoy {
  return Convoy.rehydrate({
    id: row.id,
    origenId: row.origenId,
    destinoId: row.destinoId,
    escoltaNombre: row.escoltaNombre,
    escoltaCedula: row.escoltaCedula,
    vehicleIds,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
}

async function withVehicles(rows: ConvoyRow[]): Promise<Convoy[]> {
  if (!rows.length) return [];

  const ids = rows.map((row) => row.id);
  const vehicleRows = await db
    .select()
    .from(convoyVehicles)
    .where(
      ids.length === 1
        ? eq(convoyVehicles.convoyId, ids[0] as string)
        : inArray(convoyVehicles.convoyId, ids),
    );

  const byConvoy = new Map<string, string[]>();
  for (const row of vehicleRows) {
    const vehicleIds = byConvoy.get(row.convoyId) ?? [];
    vehicleIds.push(row.vehicleId);
    byConvoy.set(row.convoyId, vehicleIds);
  }

  return rows.map((row) => toDomain(row, byConvoy.get(row.id) ?? []));
}

export class DrizzleConvoyRepository implements ConvoyRepository {
  async save(convoy: Convoy): Promise<void> {
    const values = {
      id: convoy.id,
      origenId: convoy.origenId,
      destinoId: convoy.destinoId,
      escoltaNombre: convoy.escoltaNombre,
      escoltaCedula: convoy.escoltaCedula,
      status: convoy.status,
      createdAt: convoy.createdAt,
      updatedAt: convoy.updatedAt,
    };

    await db.transaction(async (tx) => {
      await tx
        .insert(convoys)
        .values(values)
        .onConflictDoUpdate({
          target: convoys.id,
          set: {
            origenId: values.origenId,
            destinoId: values.destinoId,
            escoltaNombre: values.escoltaNombre,
            escoltaCedula: values.escoltaCedula,
            status: values.status,
            updatedAt: values.updatedAt,
          },
        });

      await tx
        .delete(convoyVehicles)
        .where(eq(convoyVehicles.convoyId, convoy.id));

      const vehicleRows = convoy.vehicleIds.map((vehicleId) => ({
        convoyId: convoy.id,
        vehicleId,
      } satisfies ConvoyVehicleRow));

      if (vehicleRows.length) {
        await tx.insert(convoyVehicles).values(vehicleRows);
      }
    });
  }

  async findById(id: string): Promise<Convoy | null> {
    const rows = await db
      .select()
      .from(convoys)
      .where(eq(convoys.id, id))
      .limit(1);
    const result = await withVehicles(rows);
    return result[0] ?? null;
  }

  async findAll(filter: { status?: ConvoyStatus } = {}): Promise<Convoy[]> {
    const rows = filter.status
      ? await db.select().from(convoys).where(eq(convoys.status, filter.status))
      : await db.select().from(convoys);

    return withVehicles(rows);
  }
}
