import { eq } from "drizzle-orm";
import { db } from "./db";
import { choferes } from "./schema";
import type { DriverRepository } from "../../domain/fleet/repositories/driver.repository";
import { Driver } from "../../domain/fleet/entities/driver";

export class DrizzleDriverRepository implements DriverRepository {
  async findById(id: string): Promise<Driver | null> {
    const [row] = await db.select().from(choferes).where(eq(choferes.id, id)).limit(1);
    return row ? Driver.rehydrate({ ...row }) : null;
  }

  async findAll(): Promise<Driver[]> {
    const rows = await db.select().from(choferes);
    return rows.map((r) => Driver.rehydrate({ ...r }));
  }

  async save(driver: Driver): Promise<void> {
    await db
      .insert(choferes)
      .values({
        id: driver.id,
        nombre: driver.nombre,
        apellido: driver.apellido,
        cedula: driver.cedula,
        licencia: driver.licencia,
        telefono: driver.telefono,
        disponible: driver.disponible,
        createdAt: driver.createdAt,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: choferes.id,
        set: {
          nombre: driver.nombre,
          apellido: driver.apellido,
          licencia: driver.licencia,
          telefono: driver.telefono,
          disponible: driver.disponible,
          updatedAt: new Date(),
        },
      });
  }

  async delete(id: string): Promise<void> {
    await db.delete(choferes).where(eq(choferes.id, id));
  }
}
