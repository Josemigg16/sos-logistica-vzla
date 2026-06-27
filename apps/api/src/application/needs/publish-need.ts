import type { NeedRepository, NeedRow } from "../../domain/resources/repositories/need.repository";
import { NeedNotFoundError } from "../../domain/resources/errors";

export class PublishNeed {
  constructor(private readonly needs: NeedRepository) {}

  async execute(id: string): Promise<NeedRow> {
    const need = await this.needs.findById(id);
    if (!need) throw new NeedNotFoundError(id);
    need.publish();
    await this.needs.save(need);
    const row = await this.needs.findByIdWithDetails(id);
    if (!row) throw new Error("Need not found after publish — this is a bug");
    return row;
  }
}
