import type { ConvoyStatus, PublicConvoy } from "@sos/shared";
import {
  ConvoyDomainError,
  InvalidConvoyTransitionError,
} from "../errors";

export interface ConvoyProps {
  id: string;
  origenId: string;
  destinoId: string;
  escoltaNombre: string;
  escoltaCedula: string | null;
  vehicleIds: string[];
  status: ConvoyStatus;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Aggregate Root del bounded context `convoys`. Un grupo de vehículos
 * escoltados desde un hub de salida (DISPATCH) hacia un hub de destino
 * (DESTINATION). Las referencias a hubs, usuarios y vehículos son solo IDs;
 * este módulo no importa entidades de otros contextos.
 *
 * FSM: PLANIFICADO → EN_RUTA → ENTREGADO → RECIBIDO
 *                  ↘           ↓
 *                   CANCELADO ←┘
 */
export class Convoy {
  private constructor(private props: ConvoyProps) {}

  // ── Factory methods ─────────────────────────────────────────────────────

  static rehydrate(props: ConvoyProps): Convoy {
    return new Convoy(props);
  }

  static create(input: {
    id: string;
    origenId: string;
    destinoId: string;
    escoltaNombre: string;
    escoltaCedula?: string | null;
    vehicleIds: string[];
  }): Convoy {
    if (input.origenId === input.destinoId) {
      throw new ConvoyDomainError(
        "El origen y destino no pueden ser el mismo hub",
        "SAME_ORIGIN_DESTINATION",
      );
    }

    if (input.vehicleIds.length === 0) {
      throw new ConvoyDomainError(
        "El convoy debe tener al menos un vehículo",
        "NO_VEHICLES",
      );
    }

    const unique = new Set(input.vehicleIds);
    if (unique.size !== input.vehicleIds.length) {
      throw new ConvoyDomainError(
        "El convoy contiene vehículos duplicados",
        "DUPLICATE_VEHICLE",
      );
    }

    const now = new Date();
    return new Convoy({
      id: input.id,
      origenId: input.origenId,
      destinoId: input.destinoId,
      escoltaNombre: input.escoltaNombre,
      escoltaCedula: input.escoltaCedula ?? null,
      vehicleIds: [...input.vehicleIds],
      status: "PLANIFICADO",
      createdAt: now,
      updatedAt: now,
    });
  }

  // ── Getters ──────────────────────────────────────────────────────────────

  get id(): string {
    return this.props.id;
  }
  get origenId(): string {
    return this.props.origenId;
  }
  get destinoId(): string {
    return this.props.destinoId;
  }
  get escoltaNombre(): string {
    return this.props.escoltaNombre;
  }
  get escoltaCedula(): string | null {
    return this.props.escoltaCedula;
  }
  get vehicleIds(): string[] {
    return [...this.props.vehicleIds];
  }
  get status(): ConvoyStatus {
    return this.props.status;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  // ── FSM helpers ──────────────────────────────────────────────────────────

  private transition(to: ConvoyStatus, allowedFrom: ConvoyStatus[]): void {
    if (!allowedFrom.includes(this.props.status)) {
      throw new InvalidConvoyTransitionError(this.props.status, to);
    }
    this.props.status = to;
    this.props.updatedAt = new Date();
  }

  // ── FSM methods ──────────────────────────────────────────────────────────

  /** PLANIFICADO → EN_RUTA */
  dispatch(): void {
    this.transition("EN_RUTA", ["PLANIFICADO"]);
  }

  /** EN_RUTA → ENTREGADO */
  deliver(): void {
    this.transition("ENTREGADO", ["EN_RUTA"]);
  }

  /** ENTREGADO → RECIBIDO */
  confirmArrival(): void {
    this.transition("RECIBIDO", ["ENTREGADO"]);
  }

  /** PLANIFICADO | EN_RUTA → CANCELADO */
  cancel(): void {
    this.transition("CANCELADO", ["PLANIFICADO", "EN_RUTA"]);
  }

  // ── Vehicle management ───────────────────────────────────────────────────

  /** Add a vehicle to the convoy. Only allowed when PLANIFICADO. */
  addVehicle(vehicleId: string): void {
    if (this.props.status !== "PLANIFICADO") {
      throw new ConvoyDomainError(
        `No se pueden agregar vehículos a un convoy en estado ${this.props.status}`,
        "CONVOY_NOT_PLANIFICADO",
      );
    }

    if (this.props.vehicleIds.includes(vehicleId)) {
      throw new ConvoyDomainError(
        `El vehículo ${vehicleId} ya está en el convoy`,
        "DUPLICATE_VEHICLE",
      );
    }

    this.props.vehicleIds.push(vehicleId);
    this.props.updatedAt = new Date();
  }

  // ── Projection ───────────────────────────────────────────────────────────

  toPublic(): PublicConvoy {
    return {
      id: this.props.id,
      origenId: this.props.origenId,
      destinoId: this.props.destinoId,
      escoltaNombre: this.props.escoltaNombre,
      escoltaCedula: this.props.escoltaCedula,
      vehicleIds: [...this.props.vehicleIds],
      status: this.props.status,
      createdAt: this.props.createdAt.toISOString(),
      updatedAt: this.props.updatedAt.toISOString(),
    };
  }
}
