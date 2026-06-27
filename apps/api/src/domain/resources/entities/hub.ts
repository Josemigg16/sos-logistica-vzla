import type { HubStatus, HubType, PublicHub } from "@sos/shared";

export interface HubProps {
  id: string;
  name: string;
  address: string;
  contact: string;
  type: HubType;
  status: HubStatus;
  latitude: number;
  longitude: number;
  coordinatorId: string | null;
  createdAt: Date;
  isInformal: boolean;
}

/**
 * Aggregate Root del bounded context `resources`. Un centro de acopio donde
 * se reciben y disponen recursos.
 */
export class Hub {
  private constructor(private props: HubProps) {}

  static rehydrate(props: HubProps): Hub {
    return new Hub(props);
  }

  static register(input: {
    id: string;
    name: string;
    address: string;
    contact: string;
    type: HubType;
    status?: HubStatus;
    latitude: number;
    longitude: number;
    coordinatorId?: string | null;
    isInformal?: boolean;
  }): Hub {
    return new Hub({
      ...input,
      status: input.status ?? "ACTIVO",
      coordinatorId: input.coordinatorId ?? null,
      createdAt: new Date(),
      isInformal: input.isInformal ?? false,
    });
  }

  get id(): string {
    return this.props.id;
  }
  get name(): string {
    return this.props.name;
  }
  get type(): HubType {
    return this.props.type;
  }
  get status(): HubStatus {
    return this.props.status;
  }
  get isActive(): boolean {
    return this.props.status === "ACTIVO";
  }
  get isInformal(): boolean {
    return this.props.isInformal;
  }

  activate(): void {
    this.props.status = "ACTIVO";
  }

  deactivate(): void {
    this.props.status = "INACTIVO";
  }

  toPublic(): PublicHub {
    return {
      id: this.props.id,
      name: this.props.name,
      address: this.props.address,
      contact: this.props.contact,
      type: this.props.type,
      status: this.props.status,
      latitude: this.props.latitude,
      longitude: this.props.longitude,
      coordinatorId: this.props.coordinatorId,
      createdAt: this.props.createdAt.toISOString(),
      isInformal: this.props.isInformal,
    };
  }
}
