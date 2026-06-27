import { prioritySchema, type PriorityName } from "@sos/shared";

/**
 * Value Object: la prioridad de un incidente. Inmutable, sin identidad —
 * dos `Priority` con el mismo valor son la misma.
 */
export class Priority {
  private constructor(public readonly value: PriorityName) {}

  static create(value: string): Priority {
    return new Priority(prioritySchema.parse(value));
  }

  equals(other: Priority): boolean {
    return this.value === other.value;
  }

  get isCritical(): boolean {
    return this.value === "CRITICAL";
  }
}
