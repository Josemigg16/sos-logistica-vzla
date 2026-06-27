import type { CreateAssignmentRequest, PublicAssignment } from "@sos/shared";
import type { OperationRepository } from "../../domain/operations/repositories/operation.repository";
import type { AssignmentRepository } from "../../domain/operations/repositories/assignment.repository";
import { Assignment } from "../../domain/operations/entities/assignment";
import { OperationNotFoundError } from "../../domain/operations/errors";

/**
 * Use case: asignar un recurso a una operación. El recurso se referencia por ID
 * (contexto `resources`); acá solo se valida que la operación exista.
 */
export class AssignResource {
  constructor(
    private readonly operations: OperationRepository,
    private readonly assignments: AssignmentRepository,
  ) {}

  async execute(
    operationId: string,
    command: CreateAssignmentRequest,
  ): Promise<PublicAssignment> {
    const operation = await this.operations.findById(operationId);
    if (!operation) throw new OperationNotFoundError(operationId);

    const assignment = Assignment.create({
      id: crypto.randomUUID(),
      operationId,
      resourceId: command.resourceId,
      quantity: command.quantity,
    });
    await this.assignments.save(assignment);
    return assignment.toPublic();
  }
}
