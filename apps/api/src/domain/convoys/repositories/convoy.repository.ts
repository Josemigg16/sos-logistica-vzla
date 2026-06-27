import type { ConvoyStatus } from "@sos/shared";
import type { Convoy } from "../entities/convoy";

export interface ConvoyRepository {
  save(convoy: Convoy): Promise<void>;
  findById(id: string): Promise<Convoy | null>;
  findAll(filter?: { status?: ConvoyStatus }): Promise<Convoy[]>;
}
