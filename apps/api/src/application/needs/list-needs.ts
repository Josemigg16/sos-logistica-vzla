import type { NeedRepository, NeedRow } from "../../domain/resources/repositories/need.repository";

/**
 * Use case: listar necesidades con datos enriquecidos (hub + producto).
 * Soporta filtrado opcional por hubId para preservar el contrato legacy ?hubId=.
 */
export class ListNeeds {
  constructor(private readonly needs: NeedRepository) {}

  async execute(hubId?: string): Promise<NeedRow[]> {
    return this.needs.listWithDetails(hubId);
  }
}
