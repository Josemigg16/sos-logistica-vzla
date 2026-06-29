import type {
  IncidentStatusName,
  PriorityName,
  PublicIncident,
  UpdateIncidentRequest,
} from "@sos/shared";

export interface IncidentProps {
  id: string;
  title: string;
  description: string;
  type: string;
  priority: PriorityName;
  status: IncidentStatusName;
  zone: string;
  latitude: number;
  longitude: number;
  reportedById: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Aggregate Root del bounded context `incidents`. Un evento de desastre con
 * ciclo de vida ACTIVE → CONTAINED → CLOSED. Las emergencias no se borran:
 * se cierran mutando `status` vía `update()`. El `reportedById` es una
 * referencia por ID al contexto `identity` (sin importar la entidad User).
 */
export class Incident {
  private constructor(private props: IncidentProps) {}

  static rehydrate(props: IncidentProps): Incident {
    return new Incident(props);
  }

  static create(input: {
    id: string;
    title: string;
    description: string;
    type: string;
    priority: PriorityName;
    zone: string;
    latitude: number;
    longitude: number;
    reportedById: string | null;
  }): Incident {
    const now = new Date();
    return new Incident({
      id: input.id,
      title: input.title,
      description: input.description,
      type: input.type,
      priority: input.priority,
      status: "ACTIVE",
      zone: input.zone,
      latitude: input.latitude,
      longitude: input.longitude,
      reportedById: input.reportedById,
      createdAt: now,
      updatedAt: now,
    });
  }

  get id(): string {
    return this.props.id;
  }
  get status(): IncidentStatusName {
    return this.props.status;
  }

  update(data: UpdateIncidentRequest): void {
    if (data.title !== undefined) this.props.title = data.title;
    if (data.description !== undefined) this.props.description = data.description;
    if (data.type !== undefined) this.props.type = data.type;
    if (data.priority !== undefined) this.props.priority = data.priority;
    if (data.status !== undefined) this.props.status = data.status;
    if (data.zone !== undefined) this.props.zone = data.zone;
    if (data.latitude !== undefined) this.props.latitude = data.latitude;
    if (data.longitude !== undefined) this.props.longitude = data.longitude;
    this.props.updatedAt = new Date();
  }

  toPublic(): PublicIncident {
    return {
      id: this.props.id,
      title: this.props.title,
      description: this.props.description,
      type: this.props.type,
      priority: this.props.priority,
      status: this.props.status,
      zone: this.props.zone,
      latitude: this.props.latitude,
      longitude: this.props.longitude,
      reportedById: this.props.reportedById,
      createdAt: this.props.createdAt.toISOString(),
      updatedAt: this.props.updatedAt.toISOString(),
    };
  }
}
