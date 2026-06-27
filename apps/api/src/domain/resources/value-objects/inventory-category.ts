import {
  inventoryCategorySchema,
  type InventoryCategoryName,
} from "@sos/shared";

/**
 * Value Object: categoría de inventario. Inmutable, validada contra el catálogo.
 * El valor es un label de UI en español (por diseño del lenguaje ubicuo).
 */
export class InventoryCategory {
  private constructor(public readonly value: InventoryCategoryName) {}

  static create(value: string): InventoryCategory {
    return new InventoryCategory(inventoryCategorySchema.parse(value));
  }

  equals(other: InventoryCategory): boolean {
    return this.value === other.value;
  }
}
