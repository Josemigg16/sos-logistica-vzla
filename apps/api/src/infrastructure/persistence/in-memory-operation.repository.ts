import type { OperationRepository } from "../../domain/operations/repositories/operation.repository";
import type { Operation } from "../../domain/operations/entities/operation";

/**
 * Adapter in-memory del puerto OperationRepository.
 */
export class InMemoryOperationRepository implements OperationRepository {
  private readonly byId = new Map<string, Operation>();

  async findById(id: string): Promise<Operation | null> {
    return this.byId.get(id) ?? null;
  }

  async findAll(): Promise<Operation[]> {
    return [...this.byId.values()];
  }

  async save(operation: Operation): Promise<void> {
    this.byId.set(operation.id, operation);
  }
}
