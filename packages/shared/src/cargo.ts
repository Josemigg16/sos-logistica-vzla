import { z } from "zod";

export const LOTE_STATUSES = ["EMBALADO", "EN_TRANSITO", "ENTREGADO", "RECIBIDO"] as const;
export const loteStatusSchema = z.enum(LOTE_STATUSES);
export type LoteStatus = z.infer<typeof loteStatusSchema>;

// --- Lote Item ---

export const createLoteItemSchema = z.object({
  productId: z.string().uuid(),
  cantidad: z.number().int().positive(),
  pesoKg: z.number().positive().optional(),
});
export type CreateLoteItemRequest = z.infer<typeof createLoteItemSchema>;

export interface PublicLoteItem {
  id: string;
  productId: string;
  productName: string;
  cantidad: number;
  pesoKg: number | null;
}

// --- Lote ---

export const createLoteSchema = z.object({
  hubOrigenId: z.string().uuid(),
  hubDestinoId: z.string().uuid().optional(),
  nota: z.string().trim().max(500).optional(),
  items: z.array(createLoteItemSchema).min(1),
});
export type CreateLoteRequest = z.infer<typeof createLoteSchema>;

export const updateLoteSchema = z.object({
  hubDestinoId: z.string().uuid().nullable().optional(),
  nota: z.string().trim().max(500).nullable().optional(),
});
export type UpdateLoteRequest = z.infer<typeof updateLoteSchema>;

export const assignVehicleSchema = z.object({
  vehiculoId: z.string().uuid(),
});
export type AssignVehicleRequest = z.infer<typeof assignVehicleSchema>;

export const transferLoteSchema = z.object({
  vehiculoDestinoId: z.string().uuid(),
  motivo: z.string().trim().max(500).default(""),
});
export type TransferLoteRequest = z.infer<typeof transferLoteSchema>;

export interface PublicLote {
  id: string;
  hubOrigenId: string;
  hubOrigenNombre: string;
  hubDestinoId: string | null;
  hubDestinoNombre: string | null;
  vehiculoId: string | null;
  vehiculoPlaca: string | null;
  convoyId: string | null;
  estado: LoteStatus;
  nota: string | null;
  pesoTotalKg: number;
  creadoPorId: string | null;
  confirmadoPorId: string | null;
  confirmadoEn: string | null;
  items: PublicLoteItem[];
  createdAt: string;
  updatedAt: string;
}

// --- Traspaso ---

export interface PublicLoteTraspaso {
  id: string;
  loteId: string;
  vehiculoOrigenId: string | null;
  vehiculoDestinoId: string;
  motivo: string;
  autorizadoPorId: string | null;
  createdAt: string;
}
