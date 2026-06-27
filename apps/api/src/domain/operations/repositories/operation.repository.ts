import type { Operation } from "../entities/operation";

/**
 * Puerto del repositorio de operaciones. La implementación vive en infra.
 */
export interface OperationRepository {
  findById(id: string): Promise<Operation | null>;
  findAll(): Promise<Operation[]>;
  save(operation: Operation): Promise<void>;
}
