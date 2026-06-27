import type { PublicVehicleType } from "@sos/shared";

export interface VehicleTypeProps {
  id: string;
  nombre: string;
  descripcion: string;
  createdAt: Date;
}

export class VehicleType {
  private constructor(private props: VehicleTypeProps) {}

  static create(input: { id: string; nombre: string; descripcion: string }): VehicleType {
    return new VehicleType({ ...input, createdAt: new Date() });
  }

  static rehydrate(props: VehicleTypeProps): VehicleType {
    return new VehicleType(props);
  }

  get id(): string { return this.props.id; }
  get nombre(): string { return this.props.nombre; }
  get descripcion(): string { return this.props.descripcion; }
  get createdAt(): Date { return this.props.createdAt; }

  update(data: { nombre?: string; descripcion?: string }): void {
    if (data.nombre !== undefined) this.props.nombre = data.nombre;
    if (data.descripcion !== undefined) this.props.descripcion = data.descripcion;
  }

  toPublic(): PublicVehicleType {
    return {
      id: this.props.id,
      nombre: this.props.nombre,
      descripcion: this.props.descripcion,
      createdAt: this.props.createdAt.toISOString(),
    };
  }
}
