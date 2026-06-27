import type { PublicConvoy } from "@sos/shared";
import { ConvoyNotFoundError } from "../../domain/convoys/errors";
import type { ConvoyRepository } from "../../domain/convoys/repositories/convoy.repository";

export interface GetConvoyInput {
  id: string;
}

export class GetConvoy {
  constructor(private readonly convoys: ConvoyRepository) {}

  async execute(input: GetConvoyInput): Promise<PublicConvoy> {
    const convoy = await this.convoys.findById(input.id);
    if (!convoy) throw new ConvoyNotFoundError(input.id);

    return convoy.toPublic();
  }
}
