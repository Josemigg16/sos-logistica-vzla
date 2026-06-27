import type { LoteStatus, PublicLote, PublicLoteItem } from "@sos/shared";
import {
  LoteNotInTransitError,
  LoteAlreadyDeliveredError,
  LoteNotDeliveredError,
  LoteAlreadyReceivedError,
} from "../errors";

export interface LoteItemProps {
  id: string;
  loteId: string;
  productId: string;
  productName: string;
  cantidad: number;
  pesoKg: number | null;
}

export interface LoteProps {
  id: string;
  hubOrigenId: string;
  hubOrigenNombre: string;
  hubDestinoId: string | null;
  hubDestinoNombre: string | null;
  vehiculoId: string | null;
  vehiculoPlaca: string | null;
  estado: LoteStatus;
  nota: string | null;
  pesoTotalKg: number;
  creadoPorId: string | null;
  confirmadoPorId: string | null;
  confirmadoEn: Date | null;
  items: LoteItemProps[];
  createdAt: Date;
  updatedAt: Date;
}

export class Lote {
  private constructor(private props: LoteProps) {}

  static create(input: {
    id: string;
    hubOrigenId: string;
    hubOrigenNombre: string;
    hubDestinoId?: string | null;
    hubDestinoNombre?: string | null;
    nota?: string | null;
    items: LoteItemProps[];
    creadoPorId?: string | null;
  }): Lote {
    const pesoTotal = input.items.reduce((acc, it) => acc + (it.pesoKg ?? 0), 0);
    return new Lote({
      id: input.id,
      hubOrigenId: input.hubOrigenId,
      hubOrigenNombre: input.hubOrigenNombre,
      hubDestinoId: input.hubDestinoId ?? null,
      hubDestinoNombre: input.hubDestinoNombre ?? null,
      vehiculoId: null,
      vehiculoPlaca: null,
      estado: "EMBALADO",
      nota: input.nota ?? null,
      pesoTotalKg: pesoTotal,
      creadoPorId: input.creadoPorId ?? null,
      confirmadoPorId: null,
      confirmadoEn: null,
      items: input.items,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  static rehydrate(props: LoteProps): Lote {
    return new Lote(props);
  }

  get id(): string { return this.props.id; }
  get hubOrigenId(): string { return this.props.hubOrigenId; }
  get hubDestinoId(): string | null { return this.props.hubDestinoId; }
  get vehiculoId(): string | null { return this.props.vehiculoId; }
  get estado(): LoteStatus { return this.props.estado; }
  get nota(): string | null { return this.props.nota; }
  get pesoTotalKg(): number { return this.props.pesoTotalKg; }
  get creadoPorId(): string | null { return this.props.creadoPorId; }
  get confirmadoPorId(): string | null { return this.props.confirmadoPorId; }
  get confirmadoEn(): Date | null { return this.props.confirmadoEn; }
  get items(): LoteItemProps[] { return this.props.items; }
  get createdAt(): Date { return this.props.createdAt; }
  get updatedAt(): Date { return this.props.updatedAt; }

  assignVehicle(vehiculoId: string, vehiculoPlaca: string): void {
    this.props.vehiculoId = vehiculoId;
    this.props.vehiculoPlaca = vehiculoPlaca;
    this.props.estado = "EN_TRANSITO";
    this.props.updatedAt = new Date();
  }

  transfer(vehiculoId: string, vehiculoPlaca: string): void {
    this.props.vehiculoId = vehiculoId;
    this.props.vehiculoPlaca = vehiculoPlaca;
    this.props.updatedAt = new Date();
  }

  /** Acto 1 — el ZODI_SENDER declara la entrega. EN_TRANSITO → ENTREGADO. */
  markDelivered(): void {
    if (this.props.estado === "ENTREGADO" || this.props.estado === "RECIBIDO") {
      throw new LoteAlreadyDeliveredError(this.props.id);
    }
    if (this.props.estado !== "EN_TRANSITO") {
      throw new LoteNotInTransitError(this.props.id);
    }
    this.props.estado = "ENTREGADO";
    this.props.vehiculoId = null;
    this.props.vehiculoPlaca = null;
    this.props.updatedAt = new Date();
  }

  /** Acto 2 — el ZODI_DESTINATION acusa recibo. ENTREGADO → RECIBIDO. */
  confirmReceipt(confirmadoPorId: string): void {
    if (this.props.estado === "RECIBIDO") {
      throw new LoteAlreadyReceivedError(this.props.id);
    }
    if (this.props.estado !== "ENTREGADO") {
      throw new LoteNotDeliveredError(this.props.id);
    }
    this.props.estado = "RECIBIDO";
    this.props.confirmadoPorId = confirmadoPorId;
    this.props.confirmadoEn = new Date();
    this.props.updatedAt = new Date();
  }

  updateMeta(data: { hubDestinoId?: string | null; hubDestinoNombre?: string | null; nota?: string | null }): void {
    if (data.hubDestinoId !== undefined) this.props.hubDestinoId = data.hubDestinoId;
    if (data.hubDestinoNombre !== undefined) this.props.hubDestinoNombre = data.hubDestinoNombre;
    if (data.nota !== undefined) this.props.nota = data.nota;
    this.props.updatedAt = new Date();
  }

  toPublic(): PublicLote {
    return {
      id: this.props.id,
      hubOrigenId: this.props.hubOrigenId,
      hubOrigenNombre: this.props.hubOrigenNombre,
      hubDestinoId: this.props.hubDestinoId,
      hubDestinoNombre: this.props.hubDestinoNombre,
      vehiculoId: this.props.vehiculoId,
      vehiculoPlaca: this.props.vehiculoPlaca,
      estado: this.props.estado,
      nota: this.props.nota,
      pesoTotalKg: this.props.pesoTotalKg,
      creadoPorId: this.props.creadoPorId,
      confirmadoPorId: this.props.confirmadoPorId,
      confirmadoEn: this.props.confirmadoEn ? this.props.confirmadoEn.toISOString() : null,
      items: this.props.items.map((it): PublicLoteItem => ({
        id: it.id,
        productId: it.productId,
        productName: it.productName,
        cantidad: it.cantidad,
        pesoKg: it.pesoKg,
      })),
      createdAt: this.props.createdAt.toISOString(),
      updatedAt: this.props.updatedAt.toISOString(),
    };
  }
}
