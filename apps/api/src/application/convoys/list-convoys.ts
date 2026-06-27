import type { ConvoyStatus, PublicConvoy } from "@sos/shared";
import type { ConvoyRepository } from "../../domain/convoys/repositories/convoy.repository";

export interface ListConvoysInput {
  status?: ConvoyStatus;
}

export class ListConvoys {
  constructor(private readonly convoys: ConvoyRepository) {}

  async execute(input: ListConvoysInput = {}): Promise<PublicConvoy[]> {
    const convoys = await this.convoys.findAll(input);
    return convoys.map((convoy) => convoy.toPublic());
  }
}
