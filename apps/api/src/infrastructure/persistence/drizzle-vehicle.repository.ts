import { eq } from "drizzle-orm";
import { db } from "./db";
import { vehiculos } from "./schema";
import type { VehicleRepository } from "../../domain/fleet/repositories/vehicle.repository";
import { Vehicle } from "../../domain/fleet/entities/vehicle";

type Row = typeof vehiculos.$inferSelect;

function toDomain(row: Row): Vehicle {
  return Vehicle.rehydrate({
    id: row.id,
    placa: row.placa,
    modelo: row.modelo,
    capacidadCargaKg: row.capacidadCargaKg,
    estado: row.estado,
    tipoVehiculoId: row.tipoVehiculoId ?? null,
    choferId: row.choferId ?? null,
    centroOrigenId: row.centroOrigenId ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
}

export class DrizzleVehicleRepository implements VehicleRepository {
  async findById(id: string): Promise<Vehicle | null> {
    const [row] = await db.select().from(vehiculos).where(eq(vehiculos.id, id)).limit(1);
    return row ? toDomain(row) : null;
  }

  async findAll(): Promise<Vehicle[]> {
    const rows = await db.select().from(vehiculos);
    return rows.map(toDomain);
  }

  async save(vehicle: Vehicle): Promise<void> {
    const values = {
      id: vehicle.id,
      placa: vehicle.placa,
      modelo: vehicle.modelo,
      capacidadCargaKg: vehicle.capacidadCargaKg,
      estado: vehicle.estado,
      tipoVehiculoId: vehicle.tipoVehiculoId,
      choferId: vehicle.choferId,
      centroOrigenId: vehicle.centroOrigenId,
      createdAt: vehicle.createdAt,
      updatedAt: vehicle.updatedAt,
    };
    await db
      .insert(vehiculos)
      .values(values)
      .onConflictDoUpdate({
        target: vehiculos.id,
        set: {
          placa: values.placa,
          modelo: values.modelo,
          capacidadCargaKg: values.capacidadCargaKg,
          estado: values.estado,
          tipoVehiculoId: values.tipoVehiculoId,
          choferId: values.choferId,
          centroOrigenId: values.centroOrigenId,
          updatedAt: values.updatedAt,
        },
      });
  }

  async delete(id: string): Promise<void> {
    await db.delete(vehiculos).where(eq(vehiculos.id, id));
  }
}
