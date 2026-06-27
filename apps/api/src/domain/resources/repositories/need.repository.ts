import type { Need } from "../entities/need";

/**
 * Read model — datos enriquecidos con JOIN a hubs y products.
 * Lo producen las implementaciones del repositorio (Drizzle hace el JOIN real;
 * in-memory lo simula resolviendo las entidades asociadas).
 */
export interface NeedRow {
  id: string;
  hubId?: string;
  hubName?: string;
  productId: string;
  nombre: string;
  categoria: string;
  unidad: string;
  meta: number;
  recibido: number;
  prioridad: string;
  descripcion: string;
  /** "YYYY-MM-DD" or null — ya formateado para el contrato de la API */
  fechaNecesidad: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Puerto del repositorio de necesidades. Vive en dominio; la implementación en infra.
 */
export interface NeedRepository {
  findById(id: string): Promise<Need | null>;
  findByIdWithDetails(id: string): Promise<NeedRow | null>;
  save(need: Need): Promise<void>;
  delete(id: string): Promise<boolean>;
  listWithDetails(hubId?: string): Promise<NeedRow[]>;
}
