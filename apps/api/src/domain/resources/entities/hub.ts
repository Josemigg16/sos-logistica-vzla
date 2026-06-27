import type { HubType, PublicHub } from "@sos/shared";

export interface HubProps {
  id: string;
  name: string;
  address: string;
  contact: string;
  type: HubType;
  latitude: number;
  longitude: number;
  coordinatorId: string | null;
  createdAt: Date;
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
    latitude: number;
    longitude: number;
    coordinatorId?: string | null;
  }): Hub {
    return new Hub({ ...input, coordinatorId: input.coordinatorId ?? null, createdAt: new Date() });
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

  toPublic(): PublicHub {
    return {
      id: this.props.id,
      name: this.props.name,
      address: this.props.address,
      contact: this.props.contact,
      type: this.props.type,
      latitude: this.props.latitude,
      longitude: this.props.longitude,
      coordinatorId: this.props.coordinatorId,
      createdAt: this.props.createdAt.toISOString(),
    };
  }
}
