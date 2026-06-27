import type { PublicConvoy } from "@sos/shared";
import { ConvoyNotFoundError } from "../../domain/convoys/errors";
import type { ConvoyRepository } from "../../domain/convoys/repositories/convoy.repository";

export interface CancelConvoyCommand {
  id: string;
}

export class CancelConvoy {
  constructor(private readonly convoys: ConvoyRepository) {}

  async execute(command: CancelConvoyCommand): Promise<PublicConvoy> {
    const convoy = await this.convoys.findById(command.id);
    if (!convoy) throw new ConvoyNotFoundError(command.id);

    convoy.cancel();
    await this.convoys.save(convoy);
    return convoy.toPublic();
  }
}
