import type { PublicConvoy } from "@sos/shared";
import { ConvoyNotFoundError } from "../../domain/convoys/errors";
import type { ConvoyRepository } from "../../domain/convoys/repositories/convoy.repository";

export interface StartConvoyCommand {
  id: string;
}

export class StartConvoy {
  constructor(private readonly convoys: ConvoyRepository) {}

  async execute(command: StartConvoyCommand): Promise<PublicConvoy> {
    const convoy = await this.convoys.findById(command.id);
    if (!convoy) throw new ConvoyNotFoundError(command.id);

    convoy.dispatch();
    await this.convoys.save(convoy);
    return convoy.toPublic();
  }
}
