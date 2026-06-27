import { eq } from "drizzle-orm";
import { db } from "./db";
import { tiposVehiculo } from "./schema";
import type { VehicleTypeRepository } from "../../domain/fleet/repositories/vehicle-type.repository";
import { VehicleType } from "../../domain/fleet/entities/vehicle-type";

type Row = typeof tiposVehiculo.$inferSelect;

function toDomain(row: Row): VehicleType {
  return VehicleType.rehydrate({
    id: row.id,
    nombre: row.nombre,
    descripcion: row.descripcion,
    createdAt: row.createdAt,
  });
}

export class DrizzleVehicleTypeRepository implements VehicleTypeRepository {
  async findById(id: string): Promise<VehicleType | null> {
    const [row] = await db.select().from(tiposVehiculo).where(eq(tiposVehiculo.id, id)).limit(1);
    return row ? toDomain(row) : null;
  }

  async findAll(): Promise<VehicleType[]> {
    const rows = await db.select().from(tiposVehiculo);
    return rows.map(toDomain);
  }

  async save(vehicleType: VehicleType): Promise<void> {
    const values = {
      id: vehicleType.id,
      nombre: vehicleType.nombre,
      descripcion: vehicleType.descripcion,
      createdAt: vehicleType.createdAt,
    };
    await db
      .insert(tiposVehiculo)
      .values(values)
      .onConflictDoUpdate({
        target: tiposVehiculo.id,
        set: { nombre: values.nombre, descripcion: values.descripcion },
      });
  }

  async delete(id: string): Promise<void> {
    await db.delete(tiposVehiculo).where(eq(tiposVehiculo.id, id));
  }
}
