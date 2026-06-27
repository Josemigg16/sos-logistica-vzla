import { eq } from "drizzle-orm";
import { db } from "./db";
import { assignments } from "./schema";
import type { AssignmentRepository } from "../../domain/operations/repositories/assignment.repository";
import { Assignment } from "../../domain/operations/entities/assignment";

type AssignmentRow = typeof assignments.$inferSelect;

function toDomain(row: AssignmentRow): Assignment {
  return Assignment.rehydrate({
    id: row.id,
    operationId: row.operationId,
    resourceId: row.resourceId,
    quantity: row.quantity,
    createdAt: row.createdAt,
  });
}

export class DrizzleAssignmentRepository implements AssignmentRepository {
  async findById(id: string): Promise<Assignment | null> {
    const [row] = await db
      .select()
      .from(assignments)
      .where(eq(assignments.id, id))
      .limit(1);
    return row ? toDomain(row) : null;
  }

  async findByOperation(operationId: string): Promise<Assignment[]> {
    const rows = await db
      .select()
      .from(assignments)
      .where(eq(assignments.operationId, operationId));
    return rows.map(toDomain);
  }

  async save(assignment: Assignment): Promise<void> {
    const pub = assignment.toPublic();
    await db.insert(assignments).values({
      id: pub.id,
      operationId: pub.operationId,
      resourceId: pub.resourceId,
      quantity: pub.quantity,
      createdAt: new Date(pub.createdAt),
    });
  }
}
