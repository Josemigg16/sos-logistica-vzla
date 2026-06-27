import type { OperationStatusName, PublicOperation } from "@sos/shared";
import { InvalidOperationTransitionError } from "../errors";

export interface OperationProps {
  id: string;
  name: string;
  status: OperationStatusName;
  incidentId: string;
  zone: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Aggregate Root del bounded context `operations`. Una misión de respuesta con
 * ciclo de vida PLANNED → ACTIVE → COMPLETED (o CANCELLED). El `incidentId` es
 * una referencia por ID a otro contexto: no se importa la entidad Incident.
 */
export class Operation {
  private constructor(private props: OperationProps) {}

  static rehydrate(props: OperationProps): Operation {
    return new Operation(props);
  }

  static plan(input: {
    id: string;
    name: string;
    incidentId: string;
    zone: string;
  }): Operation {
    const now = new Date();
    return new Operation({
      id: input.id,
      name: input.name,
      status: "PLANNED",
      incidentId: input.incidentId,
      zone: input.zone,
      createdAt: now,
      updatedAt: now,
    });
  }

  get id(): string {
    return this.props.id;
  }
  get name(): string {
    return this.props.name;
  }
  get status(): OperationStatusName {
    return this.props.status;
  }

  private transition(
    to: OperationStatusName,
    allowedFrom: OperationStatusName[],
  ): void {
    if (!allowedFrom.includes(this.props.status)) {
      throw new InvalidOperationTransitionError(this.props.status, to);
    }
    this.props.status = to;
    this.props.updatedAt = new Date();
  }

  activate(): void {
    this.transition("ACTIVE", ["PLANNED"]);
  }

  complete(): void {
    this.transition("COMPLETED", ["ACTIVE"]);
  }

  cancel(): void {
    this.transition("CANCELLED", ["PLANNED", "ACTIVE"]);
  }

  toPublic(): PublicOperation {
    return {
      id: this.props.id,
      name: this.props.name,
      status: this.props.status,
      incidentId: this.props.incidentId,
      zone: this.props.zone,
      createdAt: this.props.createdAt.toISOString(),
      updatedAt: this.props.updatedAt.toISOString(),
    };
  }
}
