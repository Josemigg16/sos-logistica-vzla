import type { Hub } from "../entities/hub";

/**
 * Puerto del repositorio de centros de acopio. La implementación vive en infra.
 */
export interface HubRepository {
  findById(id: string): Promise<Hub | null>;
  findByCoordinator(coordinatorId: string): Promise<Hub | null>;
  findAll(): Promise<Hub[]>;
  save(hub: Hub): Promise<void>;
  delete(id: string): Promise<void>;
}
