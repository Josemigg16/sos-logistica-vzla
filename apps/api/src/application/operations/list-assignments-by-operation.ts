import type { PublicAssignment } from "@sos/shared";
import type { AssignmentRepository } from "../../domain/operations/repositories/assignment.repository";

/**
 * Use case: listar las asignaciones de una operación.
 */
export class ListAssignmentsByOperation {
  constructor(private readonly assignments: AssignmentRepository) {}

  async execute(operationId: string): Promise<PublicAssignment[]> {
    const assignments = await this.assignments.findByOperation(operationId);
    return assignments.map((assignment) => assignment.toPublic());
  }
}
