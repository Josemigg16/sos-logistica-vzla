import { roleSchema, type RoleName } from "@sos/shared";

/**
 * Value Object: el rol de un usuario. Inmutable, sin identidad propia.
 * Se define por su valor — dos `Role` con el mismo valor son el mismo.
 */
export class Role {
  private constructor(public readonly value: RoleName) {}

  static create(value: string): Role {
    return new Role(roleSchema.parse(value));
  }

  equals(other: Role): boolean {
    return this.value === other.value;
  }

  isAdmin(): boolean {
    return this.value === "ADMIN";
  }
}
