import type { PublicDriver } from "@sos/shared";

export interface DriverProps {
  id: string;
  nombre: string;
  apellido: string;
  cedula: string;
  licencia: string;
  telefono: string;
  disponible: boolean;
  createdAt: Date;
}

export class Driver {
  private constructor(private props: DriverProps) {}

  static create(input: {
    id: string;
    nombre: string;
    apellido: string;
    cedula: string;
    licencia: string;
    telefono: string;
  }): Driver {
    return new Driver({ ...input, disponible: true, createdAt: new Date() });
  }

  static rehydrate(props: DriverProps): Driver {
    return new Driver(props);
  }

  get id(): string { return this.props.id; }
  get nombre(): string { return this.props.nombre; }
  get apellido(): string { return this.props.apellido; }
  get cedula(): string { return this.props.cedula; }
  get licencia(): string { return this.props.licencia; }
  get telefono(): string { return this.props.telefono; }
  get disponible(): boolean { return this.props.disponible; }
  get createdAt(): Date { return this.props.createdAt; }

  update(data: {
    nombre?: string;
    apellido?: string;
    licencia?: string;
    telefono?: string;
    disponible?: boolean;
  }): void {
    if (data.nombre !== undefined) this.props.nombre = data.nombre;
    if (data.apellido !== undefined) this.props.apellido = data.apellido;
    if (data.licencia !== undefined) this.props.licencia = data.licencia;
    if (data.telefono !== undefined) this.props.telefono = data.telefono;
    if (data.disponible !== undefined) this.props.disponible = data.disponible;
  }

  toPublic(): PublicDriver {
    return {
      id: this.props.id,
      nombre: this.props.nombre,
      apellido: this.props.apellido,
      cedula: this.props.cedula,
      licencia: this.props.licencia,
      telefono: this.props.telefono,
      disponible: this.props.disponible,
      createdAt: this.props.createdAt.toISOString(),
    };
  }
}
