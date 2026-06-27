import type { NeedRepository, NeedRow } from "../../domain/resources/repositories/need.repository";
import type { Need } from "../../domain/resources/entities/need";

/**
 * Interfaz mínima para resolver el nombre del hub a partir de su ID.
 * Se inyecta desde el test con InMemoryHubRepository, que satisface esta forma.
 */
interface HubNameLookup {
  findById(id: string): Promise<{ name: string } | null>;
}

/**
 * Interfaz mínima para resolver datos del producto a partir de su ID.
 * Se inyecta desde el test con InMemoryProductCatalogRepository.
 */
interface ProductLookup {
  findById(id: string): Promise<{ name: string; category: string; unit: string } | null>;
}

/**
 * Adapter in-memory del puerto NeedRepository.
 * Simula el JOIN a hubs y products resolviendo las entidades asociadas mediante
 * las interfaces inyectadas (HubNameLookup, ProductLookup).
 * Úsalo en tests con InMemoryHubRepository + InMemoryProductCatalogRepository.
 */
export class InMemoryNeedRepository implements NeedRepository {
  private readonly byId = new Map<string, Need>();

  constructor(
    private readonly hubLookup: HubNameLookup,
    private readonly productLookup: ProductLookup,
  ) {}

  async findById(id: string): Promise<Need | null> {
    return this.byId.get(id) ?? null;
  }

  async findByIdWithDetails(id: string): Promise<NeedRow | null> {
    const need = this.byId.get(id);
    if (!need) return null;
    return this.toRow(need);
  }

  async save(need: Need): Promise<void> {
    this.byId.set(need.id, need);
  }

  async delete(id: string): Promise<boolean> {
    if (!this.byId.has(id)) return false;
    this.byId.delete(id);
    return true;
  }

  async listWithDetails(hubId?: string): Promise<NeedRow[]> {
    let needs = [...this.byId.values()];
    if (hubId) needs = needs.filter((n) => n.hubId != null && n.hubId === hubId);

    const rows = await Promise.all(needs.map((n) => this.toRow(n)));
    return rows.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  private async toRow(need: Need): Promise<NeedRow> {
    const hub = need.hubId ? await this.hubLookup.findById(need.hubId) : null;
    const product = await this.productLookup.findById(need.productId);
    return {
      id: need.id,
      hubId: need.hubId ?? undefined,
      hubName: hub?.name ?? undefined,
      productId: need.productId,
      nombre: product?.name ?? "",
      categoria: product?.category ?? "",
      unidad: product?.unit ?? "",
      meta: need.meta,
      recibido: need.recibido,
      prioridad: need.prioridad,
      descripcion: need.descripcion,
      fechaNecesidad: need.fechaNecesidad
        ? need.fechaNecesidad.toISOString().split("T")[0]!
        : null,
      createdAt: need.createdAt,
      updatedAt: need.updatedAt,
    };
  }
}
