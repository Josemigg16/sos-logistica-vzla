import { desc, eq, and } from "drizzle-orm";
import { db } from "./db";
import { needs, hubs, products } from "./schema/resources.schema";
import type { NeedRepository, NeedRow } from "../../domain/resources/repositories/need.repository";
import { Need } from "../../domain/resources/entities/need";

type NeedRecord = typeof needs.$inferSelect;

function toDomain(row: NeedRecord): Need {
  return Need.rehydrate({
    id: row.id,
    hubId: row.hubId ?? undefined,
    productId: row.productId,
    meta: row.meta,
    recibido: row.recibido,
    prioridad: row.prioridad,
    descripcion: row.descripcion ?? "",
    fechaNecesidad: row.fechaNecesidad ?? null,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
}

function toRow(joined: {
  id: string;
  hubId: string | null;
  hubName: string | null;
  productId: string;
  nombre: string;
  categoria: string;
  unidad: string;
  meta: number;
  recibido: number;
  prioridad: string;
  descripcion: string | null;
  status: "DRAFT" | "PUBLISHED";
  fechaNecesidad: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): NeedRow {
  return {
    id: joined.id,
    hubId: joined.hubId ?? undefined,
    hubName: joined.hubName ?? undefined,
    productId: joined.productId,
    nombre: joined.nombre,
    categoria: joined.categoria,
    unidad: joined.unidad,
    meta: joined.meta,
    recibido: joined.recibido,
    prioridad: joined.prioridad,
    descripcion: joined.descripcion ?? "",
    status: joined.status,
    fechaNecesidad: joined.fechaNecesidad
      ? joined.fechaNecesidad.toISOString().split("T")[0]!
      : null,
    createdAt: joined.createdAt,
    updatedAt: joined.updatedAt,
  };
}

const SELECT_JOINED = {
  id: needs.id,
  hubId: needs.hubId,
  hubName: hubs.name,
  productId: needs.productId,
  nombre: products.name,
  categoria: products.category,
  unidad: products.unit,
  meta: needs.meta,
  recibido: needs.recibido,
  prioridad: needs.prioridad,
  descripcion: needs.descripcion,
  status: needs.status,
  fechaNecesidad: needs.fechaNecesidad,
  createdAt: needs.createdAt,
  updatedAt: needs.updatedAt,
};

/**
 * Adapter Drizzle del puerto NeedRepository.
 * listWithDetails y findByIdWithDetails realizan un JOIN real contra hubs y products.
 */
export class DrizzleNeedRepository implements NeedRepository {
  async findById(id: string): Promise<Need | null> {
    const [row] = await db.select().from(needs).where(eq(needs.id, id)).limit(1);
    return row ? toDomain(row) : null;
  }

  async findByIdWithDetails(id: string): Promise<NeedRow | null> {
    const [row] = await db
      .select(SELECT_JOINED)
      .from(needs)
      .leftJoin(hubs, eq(needs.hubId, hubs.id))
      .innerJoin(products, eq(needs.productId, products.id))
      .where(eq(needs.id, id))
      .limit(1);
    return row ? toRow(row) : null;
  }

  async save(need: Need): Promise<void> {
    const data = need.toData();
    await db
      .insert(needs)
      .values({
        id: data.id,
        hubId: data.hubId,
        productId: data.productId,
        meta: data.meta,
        recibido: data.recibido,
        prioridad: data.prioridad,
        descripcion: data.descripcion,
        status: data.status,
        fechaNecesidad: data.fechaNecesidad,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      })
      .onConflictDoUpdate({
        target: needs.id,
        set: {
          meta: data.meta,
          recibido: data.recibido,
          prioridad: data.prioridad,
          descripcion: data.descripcion,
          status: data.status,
          fechaNecesidad: data.fechaNecesidad,
          updatedAt: data.updatedAt,
        },
      });
  }

  async delete(id: string): Promise<boolean> {
    const deleted = await db.delete(needs).where(eq(needs.id, id)).returning();
    return deleted.length > 0;
  }

  async listWithDetails(hubId?: string, onlyPublished: boolean = true): Promise<NeedRow[]> {
    const rows = await db
      .select(SELECT_JOINED)
      .from(needs)
      .leftJoin(hubs, eq(needs.hubId, hubs.id))
      .innerJoin(products, eq(needs.productId, products.id))
      .where(
        and(
          onlyPublished ? eq(needs.status, "PUBLISHED") : undefined,
          hubId ? eq(needs.hubId, hubId) : undefined,
        ),
      )
      .orderBy(desc(needs.createdAt));
    return rows.map(toRow);
  }
}
