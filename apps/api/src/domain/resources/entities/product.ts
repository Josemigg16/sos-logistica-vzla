import type { InventoryCategoryName, ProductMaster } from "@sos/shared";

export interface ProductProps {
  id: string;
  name: string;
  category: InventoryCategoryName;
  unit: string;
  description: string;
  createdAt: Date;
}

/**
 * Entidad del bounded context `resources`. Representa un artículo del catálogo
 * maestro de productos disponibles para inventario y necesidades.
 */
export class Product {
  private constructor(private props: ProductProps) {}

  static create(input: {
    id: string;
    name: string;
    category: InventoryCategoryName;
    unit: string;
    description: string;
  }): Product {
    return new Product({ ...input, createdAt: new Date() });
  }

  static rehydrate(props: ProductProps): Product {
    return new Product(props);
  }

  get id(): string {
    return this.props.id;
  }
  get name(): string {
    return this.props.name;
  }
  get category(): InventoryCategoryName {
    return this.props.category;
  }
  get unit(): string {
    return this.props.unit;
  }
  get description(): string {
    return this.props.description;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }

  update(data: {
    name: string;
    category: InventoryCategoryName;
    unit: string;
    description: string;
  }): void {
    this.props.name = data.name;
    this.props.category = data.category;
    this.props.unit = data.unit;
    this.props.description = data.description;
  }

  toPublic(): ProductMaster {
    return {
      id: this.props.id,
      name: this.props.name,
      category: this.props.category,
      unit: this.props.unit,
      description: this.props.description,
    };
  }
}
