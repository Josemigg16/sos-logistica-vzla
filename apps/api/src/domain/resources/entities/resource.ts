import type { PublicResource } from "@sos/shared";
import { InventoryCategory } from "../value-objects/inventory-category";
import { InsufficientStockError, InvalidStockAmountError } from "../errors";

export interface ResourceProps {
  id: string;
  hubId: string;
  productId: string | null;
  productName: string;
  category: InventoryCategory;
  quantity: number;
  unit: string;
  updatedAt: Date;
}

/**
 * Aggregate Root del bounded context `resources`. Un bien disponible en un hub,
 * con cantidad y unidad. La invariante: el stock nunca queda negativo.
 */
export class Resource {
  private constructor(private props: ResourceProps) {}

  static rehydrate(props: ResourceProps): Resource {
    return new Resource(props);
  }

  static create(input: {
    id: string;
    hubId: string;
    productId?: string | null;
    productName?: string;
    category: InventoryCategory;
    quantity: number;
    unit: string;
  }): Resource {
    if (input.quantity < 0) throw new InvalidStockAmountError();
    return new Resource({
      ...input,
      productId: input.productId ?? null,
      productName: input.productName ?? "",
      updatedAt: new Date(),
    });
  }

  get id(): string {
    return this.props.id;
  }
  get hubId(): string {
    return this.props.hubId;
  }
  get productId(): string | null {
    return this.props.productId;
  }
  get category(): InventoryCategory {
    return this.props.category;
  }
  get quantity(): number {
    return this.props.quantity;
  }

  addStock(amount: number): void {
    if (amount < 0) throw new InvalidStockAmountError();
    this.props.quantity += amount;
    this.props.updatedAt = new Date();
  }

  removeStock(amount: number): void {
    if (amount < 0) throw new InvalidStockAmountError();
    if (amount > this.props.quantity) {
      throw new InsufficientStockError(this.props.id);
    }
    this.props.quantity -= amount;
    this.props.updatedAt = new Date();
  }

  toPublic(): PublicResource {
    return {
      id: this.props.id,
      hubId: this.props.hubId,
      productId: this.props.productId,
      productName: this.props.productName,
      category: this.props.category.value,
      quantity: this.props.quantity,
      unit: this.props.unit,
      updatedAt: this.props.updatedAt.toISOString(),
    };
  }
}
