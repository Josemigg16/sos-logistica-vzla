import type { PublicVehicle, VehicleStatus } from "@sos/shared";

export interface VehicleProps {
  id: string;
  placa: string;
  modelo: string;
  capacidadCargaKg: number;
  estado: VehicleStatus;
  tipoVehiculoId: string | null;
  choferId: string | null;
  centroOrigenId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class Vehicle {
  private constructor(private props: VehicleProps) {}

  static create(input: {
    id: string;
    placa: string;
    modelo: string;
    capacidadCargaKg: number;
    tipoVehiculoId?: string | null;
    choferId?: string | null;
    centroOrigenId?: string | null;
  }): Vehicle {
    const now = new Date();
    return new Vehicle({
      ...input,
      estado: "DISPONIBLE",
      tipoVehiculoId: input.tipoVehiculoId ?? null,
      choferId: input.choferId ?? null,
      centroOrigenId: input.centroOrigenId ?? null,
      createdAt: now,
      updatedAt: now,
    });
  }

  static rehydrate(props: VehicleProps): Vehicle {
    return new Vehicle(props);
  }

  get id(): string { return this.props.id; }
  get placa(): string { return this.props.placa; }
  get modelo(): string { return this.props.modelo; }
  get capacidadCargaKg(): number { return this.props.capacidadCargaKg; }
  get estado(): VehicleStatus { return this.props.estado; }
  get tipoVehiculoId(): string | null { return this.props.tipoVehiculoId; }
  get choferId(): string | null { return this.props.choferId; }
  get centroOrigenId(): string | null { return this.props.centroOrigenId; }
  get createdAt(): Date { return this.props.createdAt; }
  get updatedAt(): Date { return this.props.updatedAt; }

  update(data: {
    placa?: string;
    modelo?: string;
    capacidadCargaKg?: number;
    estado?: VehicleStatus;
    tipoVehiculoId?: string | null;
    choferId?: string | null;
    centroOrigenId?: string | null;
  }): void {
    if (data.placa !== undefined) this.props.placa = data.placa;
    if (data.modelo !== undefined) this.props.modelo = data.modelo;
    if (data.capacidadCargaKg !== undefined) this.props.capacidadCargaKg = data.capacidadCargaKg;
    if (data.estado !== undefined) this.props.estado = data.estado;
    if (data.tipoVehiculoId !== undefined) this.props.tipoVehiculoId = data.tipoVehiculoId;
    if (data.choferId !== undefined) this.props.choferId = data.choferId;
    if (data.centroOrigenId !== undefined) this.props.centroOrigenId = data.centroOrigenId;
    this.props.updatedAt = new Date();
  }

  toPublic(): PublicVehicle {
    return {
      id: this.props.id,
      placa: this.props.placa,
      modelo: this.props.modelo,
      capacidadCargaKg: this.props.capacidadCargaKg,
      estado: this.props.estado,
      tipoVehiculoId: this.props.tipoVehiculoId,
      choferId: this.props.choferId,
      centroOrigenId: this.props.centroOrigenId,
      createdAt: this.props.createdAt.toISOString(),
      updatedAt: this.props.updatedAt.toISOString(),
    };
  }
}
