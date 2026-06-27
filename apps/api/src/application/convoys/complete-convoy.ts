import type { PublicConvoy } from "@sos/shared";
import { ConvoyNotFoundError } from "../../domain/convoys/errors";
import type { ConvoyRepository } from "../../domain/convoys/repositories/convoy.repository";

export interface CompleteConvoyCommand {
  id: string;
}

export class CompleteConvoy {
  constructor(private readonly convoys: ConvoyRepository) {}

  async execute(command: CompleteConvoyCommand): Promise<PublicConvoy> {
    const convoy = await this.convoys.findById(command.id);
    if (!convoy) throw new ConvoyNotFoundError(command.id);

    convoy.deliver();
    await this.convoys.save(convoy);
    return convoy.toPublic();
  }
}
