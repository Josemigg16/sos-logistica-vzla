import type { Assignment } from "../entities/assignment";

/**
 * Puerto del repositorio de asignaciones. La implementación vive en infra.
 */
export interface AssignmentRepository {
  findById(id: string): Promise<Assignment | null>;
  findByOperation(operationId: string): Promise<Assignment[]>;
  save(assignment: Assignment): Promise<void>;
}
