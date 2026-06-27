import type { NeedRow } from "../../domain/resources/repositories/need.repository";
import type { CreateNeed } from "./create-need";

export interface BulkCreateNeedsCommand {
  nombres: string[];
  hubId?: string;
  categoria: string;
  prioridad: string;
  meta: number;
  descripcion?: string;
  fechaNecesidad?: string | null;
}

export class BulkCreateNeeds {
  constructor(private readonly createNeed: CreateNeed) {}

  async execute(command: BulkCreateNeedsCommand): Promise<NeedRow[]> {
    const { nombres, ...common } = command;
    const results: NeedRow[] = [];
    for (const nombre of nombres) {
      const trimmed = nombre.trim();
      if (!trimmed) continue;
      const row = await this.createNeed.execute({ nombre: trimmed, ...common });
      results.push(row);
    }
    return results;
  }
}
