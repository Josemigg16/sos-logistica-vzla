import { Need } from "../../domain/resources/entities/need";
import type { NeedRepository, NeedRow } from "../../domain/resources/repositories/need.repository";
import type { ProductCatalogPort } from "./ports/product-catalog.port";

export interface CreateNeedCommand {
  hubId?: string;
  nombre: string;
  categoria: string;
  meta: number;
  prioridad: string;
  recibido?: number;
  descripcion?: string;
  fechaNecesidad?: string | null;
}

/**
 * Use case: registrar una necesidad en un hub.
 *
 * Regla de negocio crítica: si el producto (por nombre, case-insensitive) no
 * existe en el catálogo, se crea automáticamente con:
 *   - unit = "cajas" si categoria === "Medicamentos"
 *   - unit = "kg" en cualquier otro caso
 * Esto replica exactamente la lógica del endpoint legacy /needs.
 */
export class CreateNeed {
  constructor(
    private readonly needs: NeedRepository,
    private readonly productCatalog: ProductCatalogPort,
  ) {}

  async execute(command: CreateNeedCommand): Promise<NeedRow> {
    // Find or auto-create product (case-insensitive match by nombre)
    let product = await this.productCatalog.findByName(command.nombre);

    if (!product) {
      const unit = command.categoria === "Medicamentos" ? "cajas" : "kg";
      const id = crypto.randomUUID();
      await this.productCatalog.create({
        id,
        name: command.nombre,
        category: command.categoria,
        unit,
        description: "Creado automáticamente al registrar una necesidad.",
      });
      product = { id, name: command.nombre, category: command.categoria, unit };
    }

    const need = Need.create({
      id: crypto.randomUUID(),
      hubId: command.hubId,
      productId: product.id,
      meta: Number(command.meta),
      recibido: Number(command.recibido ?? 0),
      prioridad: command.prioridad,
      descripcion: command.descripcion ?? "",
      fechaNecesidad: command.fechaNecesidad ? new Date(command.fechaNecesidad) : null,
    });

    await this.needs.save(need);

    const row = await this.needs.findByIdWithDetails(need.id);
    if (!row) throw new Error("Need not found after save — this is a bug");
    return row;
  }
}
