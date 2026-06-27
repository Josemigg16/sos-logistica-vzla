import type { PublicAssignment } from "@sos/shared";
import { InvalidAssignmentQuantityError } from "../errors";

export interface AssignmentProps {
  id: string;
  operationId: string;
  resourceId: string;
  quantity: number;
  createdAt: Date;
}

/**
 * Entidad del bounded context `operations`. Vincula un recurso a una operación.
 * `resourceId` es referencia por ID al contexto `resources`: no se importa la
 * entidad Resource.
 */
export class Assignment {
  private constructor(private props: AssignmentProps) {}

  static rehydrate(props: AssignmentProps): Assignment {
    return new Assignment(props);
  }

  static create(input: {
    id: string;
    operationId: string;
    resourceId: string;
    quantity: number;
  }): Assignment {
    if (input.quantity <= 0) throw new InvalidAssignmentQuantityError();
    return new Assignment({ ...input, createdAt: new Date() });
  }

  get id(): string {
    return this.props.id;
  }
  get operationId(): string {
    return this.props.operationId;
  }

  toPublic(): PublicAssignment {
    return {
      id: this.props.id,
      operationId: this.props.operationId,
      resourceId: this.props.resourceId,
      quantity: this.props.quantity,
      createdAt: this.props.createdAt.toISOString(),
    };
  }
}
