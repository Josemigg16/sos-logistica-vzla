import { eq, and, inArray, sql } from "drizzle-orm";
import { db } from "./db";
import { lotes, loteItems } from "./schema";
import type { LoteRepository } from "../../domain/cargo/repositories/lote.repository";
import { Lote, type LoteItemProps } from "../../domain/cargo/entities/lote";

function toItemProps(row: { id: string; loteId: string; productId: string; cantidad: number; pesoKg: number | null }): LoteItemProps {
  return {
    id: row.id,
    loteId: row.loteId,
    productId: row.productId,
    productName: "",
    cantidad: row.cantidad,
    pesoKg: row.pesoKg,
  };
}

async function withItems(loteRows: (typeof lotes.$inferSelect)[]): Promise<Lote[]> {
  if (!loteRows.length) return [];
  const ids = loteRows.map((r) => r.id);
  const itemRows = await db
    .select()
    .from(loteItems)
    .where(inArray(loteItems.loteId, ids));

  return loteRows.map((r) => {
    const items = itemRows
      .filter((it) => it.loteId === r.id)
      .map(toItemProps);
    return Lote.rehydrate({
      id: r.id,
      hubOrigenId: r.hubOrigenId,
      hubOrigenNombre: "",
      hubDestinoId: r.hubDestinoId,
      hubDestinoNombre: null,
      vehiculoId: r.vehiculoId,
      vehiculoPlaca: null,
      estado: r.estado,
      nota: r.nota,
      pesoTotalKg: r.pesoTotalKg,
      creadoPorId: r.creadoPorId,
      items,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    });
  });
}

export class DrizzleLoteRepository implements LoteRepository {
  async findById(id: string): Promise<Lote | null> {
    const rows = await db.select().from(lotes).where(eq(lotes.id, id)).limit(1);
    const result = await withItems(rows);
    return result[0] ?? null;
  }

  async findAll(): Promise<Lote[]> {
    const rows = await db.select().from(lotes);
    return withItems(rows);
  }

  async findByHub(hubId: string): Promise<Lote[]> {
    const rows = await db
      .select()
      .from(lotes)
      .where(sql`${lotes.hubOrigenId} = ${hubId} OR ${lotes.hubDestinoId} = ${hubId}`);
    return withItems(rows);
  }

  async findByVehicle(vehiculoId: string): Promise<Lote[]> {
    const rows = await db.select().from(lotes).where(eq(lotes.vehiculoId, vehiculoId));
    return withItems(rows);
  }

  async save(lote: Lote): Promise<void> {
    await db
      .insert(lotes)
      .values({
        id: lote.id,
        hubOrigenId: lote.hubOrigenId,
        hubDestinoId: lote.hubDestinoId,
        vehiculoId: lote.vehiculoId,
        estado: lote.estado,
        nota: lote.nota,
        pesoTotalKg: lote.pesoTotalKg,
        creadoPorId: lote.creadoPorId,
        createdAt: lote.createdAt,
        updatedAt: lote.updatedAt,
      })
      .onConflictDoUpdate({
        target: lotes.id,
        set: {
          hubDestinoId: lote.hubDestinoId,
          vehiculoId: lote.vehiculoId,
          estado: lote.estado,
          nota: lote.nota,
          pesoTotalKg: lote.pesoTotalKg,
          updatedAt: lote.updatedAt,
        },
      });
  }

  async saveItems(loteId: string, items: Array<{ id: string; productId: string; cantidad: number; pesoKg: number | null }>): Promise<void> {
    if (!items.length) return;
    await db.insert(loteItems).values(
      items.map((it) => ({
        id: it.id,
        loteId,
        productId: it.productId,
        cantidad: it.cantidad,
        pesoKg: it.pesoKg,
      })),
    ).onConflictDoNothing();
  }

  async delete(id: string): Promise<void> {
    await db.delete(lotes).where(eq(lotes.id, id));
  }

  async sumPesoByVehicle(vehiculoId: string): Promise<number> {
    const [row] = await db
      .select({ total: sql<number>`COALESCE(SUM(${lotes.pesoTotalKg}), 0)` })
      .from(lotes)
      .where(and(eq(lotes.vehiculoId, vehiculoId), eq(lotes.estado, "EN_TRANSITO")));
    return row?.total ?? 0;
  }
}
