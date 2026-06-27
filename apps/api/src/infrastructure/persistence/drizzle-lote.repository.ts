import { eq, and, inArray, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "./db";
import { lotes, loteItems, hubs, products, vehiculos } from "./schema";
import type { LoteRepository } from "../../domain/cargo/repositories/lote.repository";
import { Lote, type LoteItemProps } from "../../domain/cargo/entities/lote";

const hubsOrigen = alias(hubs, "hubs_origen");
const hubsDestino = alias(hubs, "hubs_destino");

interface LoteQueryResultRow {
  lote: typeof lotes.$inferSelect;
  hubOrigenNombre: string | null;
  hubDestinoNombre: string | null;
  vehiculoPlaca: string | null;
}

async function withItems(loteQueryResultRows: LoteQueryResultRow[]): Promise<Lote[]> {
  if (!loteQueryResultRows.length) return [];
  const ids = loteQueryResultRows.map((r) => r.lote.id);
  const itemRows = await db
    .select({
      id: loteItems.id,
      loteId: loteItems.loteId,
      productId: loteItems.productId,
      cantidad: loteItems.cantidad,
      pesoKg: loteItems.pesoKg,
      productName: products.name,
    })
    .from(loteItems)
    .leftJoin(products, eq(loteItems.productId, products.id))
    .where(inArray(loteItems.loteId, ids));

  return loteQueryResultRows.map((r) => {
    const items = itemRows
      .filter((it) => it.loteId === r.lote.id)
      .map((it): LoteItemProps => ({
        id: it.id,
        loteId: it.loteId,
        productId: it.productId,
        productName: it.productName ?? "",
        cantidad: it.cantidad,
        pesoKg: it.pesoKg,
      }));
    return Lote.rehydrate({
      id: r.lote.id,
      hubOrigenId: r.lote.hubOrigenId,
      hubOrigenNombre: r.hubOrigenNombre ?? "",
      hubDestinoId: r.lote.hubDestinoId,
      hubDestinoNombre: r.hubDestinoNombre,
      vehiculoId: r.lote.vehiculoId,
      vehiculoPlaca: r.vehiculoPlaca,
      estado: r.lote.estado,
      nota: r.lote.nota,
      pesoTotalKg: r.lote.pesoTotalKg,
      creadoPorId: r.lote.creadoPorId,
      confirmadoPorId: r.lote.confirmadoPorId,
      confirmadoEn: r.lote.confirmadoEn,
      items,
      createdAt: r.lote.createdAt,
      updatedAt: r.lote.updatedAt,
    });
  });
}

export class DrizzleLoteRepository implements LoteRepository {
  async findById(id: string): Promise<Lote | null> {
    const rows = await db
      .select({
        lote: lotes,
        hubOrigenNombre: hubsOrigen.name,
        hubDestinoNombre: hubsDestino.name,
        vehiculoPlaca: vehiculos.placa,
      })
      .from(lotes)
      .leftJoin(hubsOrigen, eq(lotes.hubOrigenId, hubsOrigen.id))
      .leftJoin(hubsDestino, eq(lotes.hubDestinoId, hubsDestino.id))
      .leftJoin(vehiculos, eq(lotes.vehiculoId, vehiculos.id))
      .where(eq(lotes.id, id))
      .limit(1);
    const result = await withItems(rows);
    return result[0] ?? null;
  }

  async findAll(): Promise<Lote[]> {
    const rows = await db
      .select({
        lote: lotes,
        hubOrigenNombre: hubsOrigen.name,
        hubDestinoNombre: hubsDestino.name,
        vehiculoPlaca: vehiculos.placa,
      })
      .from(lotes)
      .leftJoin(hubsOrigen, eq(lotes.hubOrigenId, hubsOrigen.id))
      .leftJoin(hubsDestino, eq(lotes.hubDestinoId, hubsDestino.id))
      .leftJoin(vehiculos, eq(lotes.vehiculoId, vehiculos.id));
    return withItems(rows);
  }

  async findByHub(hubId: string): Promise<Lote[]> {
    const rows = await db
      .select({
        lote: lotes,
        hubOrigenNombre: hubsOrigen.name,
        hubDestinoNombre: hubsDestino.name,
        vehiculoPlaca: vehiculos.placa,
      })
      .from(lotes)
      .leftJoin(hubsOrigen, eq(lotes.hubOrigenId, hubsOrigen.id))
      .leftJoin(hubsDestino, eq(lotes.hubDestinoId, hubsDestino.id))
      .leftJoin(vehiculos, eq(lotes.vehiculoId, vehiculos.id))
      .where(sql`${lotes.hubOrigenId} = ${hubId} OR ${lotes.hubDestinoId} = ${hubId}`);
    return withItems(rows);
  }

  async findByVehicle(vehiculoId: string): Promise<Lote[]> {
    const rows = await db
      .select({
        lote: lotes,
        hubOrigenNombre: hubsOrigen.name,
        hubDestinoNombre: hubsDestino.name,
        vehiculoPlaca: vehiculos.placa,
      })
      .from(lotes)
      .leftJoin(hubsOrigen, eq(lotes.hubOrigenId, hubsOrigen.id))
      .leftJoin(hubsDestino, eq(lotes.hubDestinoId, hubsDestino.id))
      .leftJoin(vehiculos, eq(lotes.vehiculoId, vehiculos.id))
      .where(eq(lotes.vehiculoId, vehiculoId));
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
        confirmadoPorId: lote.confirmadoPorId,
        confirmadoEn: lote.confirmadoEn,
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
          confirmadoPorId: lote.confirmadoPorId,
          confirmadoEn: lote.confirmadoEn,
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
