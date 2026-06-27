import type { AssignmentRepository } from "../../domain/operations/repositories/assignment.repository";
import type { Assignment } from "../../domain/operations/entities/assignment";

/**
 * Adapter in-memory del puerto AssignmentRepository.
 */
export class InMemoryAssignmentRepository implements AssignmentRepository {
  private readonly byId = new Map<string, Assignment>();

  async findById(id: string): Promise<Assignment | null> {
    return this.byId.get(id) ?? null;
  }

  async findByOperation(operationId: string): Promise<Assignment[]> {
    return [...this.byId.values()].filter(
      (a) => a.operationId === operationId,
    );
  }

  async save(assignment: Assignment): Promise<void> {
    this.byId.set(assignment.id, assignment);
  }
}
