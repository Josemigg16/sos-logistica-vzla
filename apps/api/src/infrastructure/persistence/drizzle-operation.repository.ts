import { eq } from "drizzle-orm";
import { db } from "./db";
import { operations } from "./schema";
import type { OperationRepository } from "../../domain/operations/repositories/operation.repository";
import { Operation } from "../../domain/operations/entities/operation";

type OperationRow = typeof operations.$inferSelect;

function toDomain(row: OperationRow): Operation {
  return Operation.rehydrate({
    id: row.id,
    name: row.name,
    status: row.status,
    incidentId: row.incidentId,
    zone: row.zone,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
}

export class DrizzleOperationRepository implements OperationRepository {
  async findById(id: string): Promise<Operation | null> {
    const [row] = await db
      .select()
      .from(operations)
      .where(eq(operations.id, id))
      .limit(1);
    return row ? toDomain(row) : null;
  }

  async findAll(): Promise<Operation[]> {
    const rows = await db.select().from(operations);
    return rows.map(toDomain);
  }

  async save(operation: Operation): Promise<void> {
    const pub = operation.toPublic();
    const values = {
      id: pub.id,
      name: pub.name,
      status: pub.status,
      incidentId: pub.incidentId,
      zone: pub.zone,
      createdAt: new Date(pub.createdAt),
      updatedAt: new Date(pub.updatedAt),
    };
    await db
      .insert(operations)
      .values(values)
      .onConflictDoUpdate({
        target: operations.id,
        set: {
          name: values.name,
          status: values.status,
          zone: values.zone,
          updatedAt: values.updatedAt,
        },
      });
  }
}
