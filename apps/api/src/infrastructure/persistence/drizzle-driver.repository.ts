import { eq } from "drizzle-orm";
import { db } from "./db";
import { choferes, users } from "./schema";
import type { DriverRepository } from "../../domain/fleet/repositories/driver.repository";
import { Driver } from "../../domain/fleet/entities/driver";

export class DrizzleDriverRepository implements DriverRepository {
  async findById(id: string): Promise<Driver | null> {
    const [row] = await db
      .select({
        id: choferes.id,
        username: users.username,
        licencia: choferes.licencia,
        telefono: choferes.telefono,
        disponible: choferes.disponible,
        createdAt: choferes.createdAt,
      })
      .from(choferes)
      .innerJoin(users, eq(choferes.id, users.id))
      .where(eq(choferes.id, id))
      .limit(1);
    return row
      ? Driver.rehydrate({ ...row, createdAt: row.createdAt })
      : null;
  }

  async findAll(): Promise<Driver[]> {
    const rows = await db
      .select({
        id: choferes.id,
        username: users.username,
        licencia: choferes.licencia,
        telefono: choferes.telefono,
        disponible: choferes.disponible,
        createdAt: choferes.createdAt,
      })
      .from(choferes)
      .innerJoin(users, eq(choferes.id, users.id));
    return rows.map((r) => Driver.rehydrate({ ...r, createdAt: r.createdAt }));
  }

  async save(driver: Driver): Promise<void> {
    await db
      .insert(choferes)
      .values({
        id: driver.id,
        licencia: driver.licencia,
        telefono: driver.telefono,
        disponible: driver.disponible,
        createdAt: driver.createdAt,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: choferes.id,
        set: {
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
