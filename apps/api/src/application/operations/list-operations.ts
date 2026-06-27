import type { PublicOperation } from "@sos/shared";
import type { OperationRepository } from "../../domain/operations/repositories/operation.repository";

/**
 * Use case: listar operaciones.
 */
export class ListOperations {
  constructor(private readonly operations: OperationRepository) {}

  async execute(): Promise<PublicOperation[]> {
    const operations = await this.operations.findAll();
    return operations.map((operation) => operation.toPublic());
  }
}
