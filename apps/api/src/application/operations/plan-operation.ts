import type { CreateOperationRequest, PublicOperation } from "@sos/shared";
import type { OperationRepository } from "../../domain/operations/repositories/operation.repository";
import { Operation } from "../../domain/operations/entities/operation";

/**
 * Use case: planificar una operación de respuesta para un incidente.
 */
export class PlanOperation {
  constructor(private readonly operations: OperationRepository) {}

  async execute(command: CreateOperationRequest): Promise<PublicOperation> {
    const operation = Operation.plan({ id: crypto.randomUUID(), ...command });
    await this.operations.save(operation);
    return operation.toPublic();
  }
}
