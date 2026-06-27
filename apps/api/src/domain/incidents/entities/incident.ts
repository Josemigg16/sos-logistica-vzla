import type { IncidentStatusName, PublicIncident } from "@sos/shared";
import { Priority } from "../value-objects/priority";
import { IncidentAlreadyClosedError } from "../errors";

export interface IncidentProps {
  id: string;
  title: string;
  description: string;
  type: string;
  priority: Priority;
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
 * identidad y ciclo de vida ACTIVE → CONTAINED → CLOSED. Guarda sus invariantes.
 */
export class Incident {
  private constructor(private props: IncidentProps) {}

  static rehydrate(props: IncidentProps): Incident {
    return new Incident(props);
  }

  static report(input: {
    id: string;
    title: string;
    description: string;
    type: string;
    priority: Priority;
    zone: string;
    latitude: number;
    longitude: number;
    reportedById?: string | null;
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
      reportedById: input.reportedById ?? null,
      createdAt: now,
      updatedAt: now,
    });
  }

  get id(): string {
    return this.props.id;
  }
  get title(): string {
    return this.props.title;
  }
  get priority(): Priority {
    return this.props.priority;
  }
  get status(): IncidentStatusName {
    return this.props.status;
  }
  get zone(): string {
    return this.props.zone;
  }

  /** Un incidente abierto (no cerrado) sigue requiriendo respuesta. */
  get isOpen(): boolean {
    return this.props.status !== "CLOSED";
  }

  /** Invariante: un incidente cerrado es terminal, no admite transiciones. */
  private ensureNotClosed(): void {
    if (this.props.status === "CLOSED") {
      throw new IncidentAlreadyClosedError(this.props.id);
    }
  }

  contain(): void {
    this.ensureNotClosed();
    this.props.status = "CONTAINED";
    this.props.updatedAt = new Date();
  }

  close(): void {
    this.ensureNotClosed();
    this.props.status = "CLOSED";
    this.props.updatedAt = new Date();
  }

  toPublic(): PublicIncident {
    return {
      id: this.props.id,
      title: this.props.title,
      description: this.props.description,
      type: this.props.type,
      priority: this.props.priority.value,
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
