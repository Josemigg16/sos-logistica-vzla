import type { PublicDriver } from "@sos/shared";

export interface DriverProps {
  id: string;
  username: string;
  licencia: string;
  telefono: string;
  disponible: boolean;
  createdAt: Date;
}

export class Driver {
  private constructor(private props: DriverProps) {}

  static create(input: {
    id: string;
    username: string;
    licencia: string;
    telefono: string;
  }): Driver {
    return new Driver({ ...input, disponible: true, createdAt: new Date() });
  }

  static rehydrate(props: DriverProps): Driver {
    return new Driver(props);
  }

  get id(): string { return this.props.id; }
  get username(): string { return this.props.username; }
  get licencia(): string { return this.props.licencia; }
  get telefono(): string { return this.props.telefono; }
  get disponible(): boolean { return this.props.disponible; }
  get createdAt(): Date { return this.props.createdAt; }

  update(data: { licencia?: string; telefono?: string; disponible?: boolean }): void {
    if (data.licencia !== undefined) this.props.licencia = data.licencia;
    if (data.telefono !== undefined) this.props.telefono = data.telefono;
    if (data.disponible !== undefined) this.props.disponible = data.disponible;
  }

  toPublic(): PublicDriver {
    return {
      id: this.props.id,
      username: this.props.username,
      licencia: this.props.licencia,
      telefono: this.props.telefono,
      disponible: this.props.disponible,
      createdAt: this.props.createdAt.toISOString(),
    };
  }
}
