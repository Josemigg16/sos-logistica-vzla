export type NeedStatus = "DRAFT" | "PUBLISHED";

export interface NeedProps {
  id: string;
  hubId?: string;
  productId: string;
  meta: number;
  recibido: number;
  prioridad: string;
  descripcion: string;
  fechaNecesidad: Date | null;
  status: NeedStatus;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Entidad del bounded context `resources` — necesidad de suministros en un hub.
 * Referencia a Hub y Product por ID (no importa sus entidades — isolación de módulo).
 */
export class Need {
  private constructor(private props: NeedProps) {}

  static rehydrate(props: NeedProps): Need {
    return new Need(props);
  }

  static create(input: {
    id: string;
    hubId?: string;
    productId: string;
    meta: number;
    recibido?: number;
    prioridad: string;
    descripcion?: string;
    fechaNecesidad?: Date | null;
  }): Need {
    const now = new Date();
    return new Need({
      id: input.id,
      hubId: input.hubId,
      productId: input.productId,
      meta: input.meta,
      recibido: input.recibido ?? 0,
      prioridad: input.prioridad,
      descripcion: input.descripcion ?? "",
      fechaNecesidad: input.fechaNecesidad ?? null,
      status: "DRAFT",
      createdAt: now,
      updatedAt: now,
    });
  }

  get id(): string { return this.props.id; }
  get hubId(): string | undefined { return this.props.hubId; }
  get productId(): string { return this.props.productId; }
  get meta(): number { return this.props.meta; }
  get recibido(): number { return this.props.recibido; }
  get prioridad(): string { return this.props.prioridad; }
  get descripcion(): string { return this.props.descripcion; }
  get fechaNecesidad(): Date | null { return this.props.fechaNecesidad; }
  get status(): NeedStatus { return this.props.status; }
  get createdAt(): Date { return this.props.createdAt; }
  get updatedAt(): Date { return this.props.updatedAt; }

  update(fields: {
    meta?: number;
    recibido?: number;
    prioridad?: string;
    descripcion?: string;
    fechaNecesidad?: Date | null;
  }): void {
    if (fields.meta !== undefined) this.props.meta = fields.meta;
    if (fields.recibido !== undefined) this.props.recibido = fields.recibido;
    if (fields.prioridad !== undefined) this.props.prioridad = fields.prioridad;
    if (fields.descripcion !== undefined) this.props.descripcion = fields.descripcion;
    if (fields.fechaNecesidad !== undefined) this.props.fechaNecesidad = fields.fechaNecesidad;
    this.props.updatedAt = new Date();
  }

  publish(): void {
    this.props.status = "PUBLISHED";
    this.props.updatedAt = new Date();
  }

  toData(): NeedProps {
    return { ...this.props };
  }
}
