import { CreateLote } from "../application/cargo/create-lote";
import { ListLotes } from "../application/cargo/list-lotes";
import { UpdateLote } from "../application/cargo/update-lote";
import { DeleteLote } from "../application/cargo/delete-lote";
import { AssignVehicle } from "../application/cargo/assign-vehicle";
import { TransferLote } from "../application/cargo/transfer-lote";
import { DrizzleLoteRepository } from "./persistence/drizzle-lote.repository";
import { createCargoRoutes } from "./http/cargo.routes";
import { db } from "./persistence/db";
import { hubs, vehiculos } from "./persistence/schema";
import { eq } from "drizzle-orm";

function createHubLookup() {
  return {
    async findHubById(id: string) {
      const [row] = await db.select({ id: hubs.id, name: hubs.name }).from(hubs).where(eq(hubs.id, id)).limit(1);
      return row ?? null;
    },
  };
}

function createVehicleLookup() {
  return {
    async findVehicleById(id: string) {
      const [row] = await db
        .select({
          id: vehiculos.id,
          placa: vehiculos.placa,
          capacidadCargaKg: vehiculos.capacidadCargaKg,
          choferId: vehiculos.choferId,
        })
        .from(vehiculos)
        .where(eq(vehiculos.id, id))
        .limit(1);
      return row ?? null;
    },
  };
}

export function createCargoModule() {
  const lotesRepo = new DrizzleLoteRepository();
  const hubLookup = createHubLookup();
  const vehicleLookup = createVehicleLookup();

  const useCases = {
    createLote: new CreateLote(lotesRepo, hubLookup),
    listLotes: new ListLotes(lotesRepo),
    updateLote: new UpdateLote(lotesRepo, hubLookup),
    deleteLote: new DeleteLote(lotesRepo),
    assignVehicle: new AssignVehicle(lotesRepo, vehicleLookup),
    transferLote: new TransferLote(lotesRepo, vehicleLookup),
  };

  return { useCases, routes: createCargoRoutes(useCases) };
}
