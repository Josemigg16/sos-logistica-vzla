import type { NeedRepository, NeedRow } from "../../domain/resources/repositories/need.repository";
import { NeedNotFoundError } from "../../domain/resources/errors";

export interface UpdateNeedCommand {
  id: string;
  meta?: number;
  recibido?: number;
  prioridad?: string;
  descripcion?: string;
  /**
   * Cadena "YYYY-MM-DD" para establecer la fecha, o undefined para no modificarla.
   * (El endpoint legacy no permite setear explícitamente a null vía PUT — si
   * fechaNecesidad es falsy, simplemente se ignora.)
   */
  fechaNecesidad?: string;
}

/**
 * Use case: actualizar campos opcionales de una necesidad existente.
 * Lanza NeedNotFoundError si el id no existe.
 */
export class UpdateNeed {
  constructor(private readonly needs: NeedRepository) {}

  async execute(command: UpdateNeedCommand): Promise<NeedRow> {
    const need = await this.needs.findById(command.id);
    if (!need) throw new NeedNotFoundError(command.id);

    need.update({
      meta: command.meta !== undefined ? Number(command.meta) : undefined,
      recibido: command.recibido !== undefined ? Number(command.recibido) : undefined,
      prioridad: command.prioridad,
      descripcion: command.descripcion,
      fechaNecesidad: command.fechaNecesidad ? new Date(command.fechaNecesidad) : undefined,
    });

    await this.needs.save(need);

    const row = await this.needs.findByIdWithDetails(command.id);
    if (!row) throw new Error("Need not found after update — this is a bug");
    return row;
  }
}
