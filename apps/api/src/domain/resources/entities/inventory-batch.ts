import type { PublicInventoryBatch } from "@sos/shared";
import { InvalidBatchQuantityError } from "../errors";

export interface InventoryBatchProps {
  id: string;
  hubId: string;
  productId: string;
  quantityBatches: number;
  sourceHubId: string | null;
  receivedAt: Date;
}

/**
 * Entidad del bounded context `resources`. Un lote de inventario recibido por
 * un hub. La invariante: la cantidad de lotes siempre es un entero positivo —
 * no existen "lotes vacíos".
 */
export class InventoryBatch {
  private constructor(private props: InventoryBatchProps) {}

  static rehydrate(props: InventoryBatchProps): InventoryBatch {
    return new InventoryBatch(props);
  }

  static register(input: {
    id: string;
    hubId: string;
    productId: string;
    quantityBatches: number;
    sourceHubId?: string | null;
  }): InventoryBatch {
    if (!Number.isInteger(input.quantityBatches) || input.quantityBatches <= 0) {
      throw new InvalidBatchQuantityError();
    }
    return new InventoryBatch({
      id: input.id,
      hubId: input.hubId,
      productId: input.productId,
      quantityBatches: input.quantityBatches,
      sourceHubId: input.sourceHubId ?? null,
      receivedAt: new Date(),
    });
  }

  get id(): string {
    return this.props.id;
  }
  get hubId(): string {
    return this.props.hubId;
  }
  get productId(): string {
    return this.props.productId;
  }
  get quantityBatches(): number {
    return this.props.quantityBatches;
  }
  get sourceHubId(): string | null {
    return this.props.sourceHubId;
  }
  get receivedAt(): Date {
    return this.props.receivedAt;
  }

  toPublic(): PublicInventoryBatch {
    return {
      id: this.props.id,
      hubId: this.props.hubId,
      productId: this.props.productId,
      quantityBatches: this.props.quantityBatches,
      sourceHubId: this.props.sourceHubId,
      receivedAt: this.props.receivedAt.toISOString(),
    };
  }
}
