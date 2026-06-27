import { CreateVehicleType } from "../application/fleet/create-vehicle-type";
import { ListVehicleTypes } from "../application/fleet/list-vehicle-types";
import { UpdateVehicleType } from "../application/fleet/update-vehicle-type";
import { DeleteVehicleType } from "../application/fleet/delete-vehicle-type";
import { CreateVehicle } from "../application/fleet/create-vehicle";
import { ListVehicles } from "../application/fleet/list-vehicles";
import { UpdateVehicle } from "../application/fleet/update-vehicle";
import { DeleteVehicle } from "../application/fleet/delete-vehicle";
import { CreateDriver } from "../application/fleet/create-driver";
import { ListDrivers } from "../application/fleet/list-drivers";
import { UpdateDriver } from "../application/fleet/update-driver";
import { DeleteDriver } from "../application/fleet/delete-driver";
import { DrizzleVehicleTypeRepository } from "./persistence/drizzle-vehicle-type.repository";
import { DrizzleVehicleRepository } from "./persistence/drizzle-vehicle.repository";
import { DrizzleDriverRepository } from "./persistence/drizzle-driver.repository";
import { createFleetRoutes } from "./http/fleet.routes";

export function createFleetModule() {
  const vehicleTypes = new DrizzleVehicleTypeRepository();
  const vehicles = new DrizzleVehicleRepository();
  const drivers = new DrizzleDriverRepository();

  const useCases = {
    createVehicleType: new CreateVehicleType(vehicleTypes),
    listVehicleTypes: new ListVehicleTypes(vehicleTypes),
    updateVehicleType: new UpdateVehicleType(vehicleTypes),
    deleteVehicleType: new DeleteVehicleType(vehicleTypes),
    createVehicle: new CreateVehicle(vehicles),
    listVehicles: new ListVehicles(vehicles),
    updateVehicle: new UpdateVehicle(vehicles),
    deleteVehicle: new DeleteVehicle(vehicles),
    createDriver: new CreateDriver(drivers),
    listDrivers: new ListDrivers(drivers),
    updateDriver: new UpdateDriver(drivers),
    deleteDriver: new DeleteDriver(drivers),
  };

  return { useCases, routes: createFleetRoutes(useCases) };
}
