import { z } from "zod";

export const VEHICLE_STATUSES = ["DISPONIBLE", "EN_RUTA", "FUERA_DE_SERVICIO"] as const;
export const vehicleStatusSchema = z.enum(VEHICLE_STATUSES);
export type VehicleStatus = z.infer<typeof vehicleStatusSchema>;

// --- Tipo de Vehículo ---

export const createVehicleTypeSchema = z.object({
  nombre: z.string().trim().min(1).max(80),
  descripcion: z.string().trim().max(255).default(""),
});
export type CreateVehicleTypeRequest = z.infer<typeof createVehicleTypeSchema>;

export const updateVehicleTypeSchema = createVehicleTypeSchema.partial();
export type UpdateVehicleTypeRequest = z.infer<typeof updateVehicleTypeSchema>;

export interface PublicVehicleType {
  id: string;
  nombre: string;
  descripcion: string;
  createdAt: string;
}

// --- Vehículo ---

export const createVehicleSchema = z.object({
  placa: z.string().trim().min(1).max(20),
  modelo: z.string().trim().min(1).max(100),
  capacidadCargaKg: z.number().positive(),
  tipoVehiculoId: z.string().uuid().optional(),
  choferId: z.string().uuid().optional(),
  centroOrigenId: z.string().uuid().optional(),
});
export type CreateVehicleRequest = z.infer<typeof createVehicleSchema>;

export const updateVehicleSchema = z.object({
  placa: z.string().trim().min(1).max(20).optional(),
  modelo: z.string().trim().min(1).max(100).optional(),
  capacidadCargaKg: z.number().positive().optional(),
  estado: vehicleStatusSchema.optional(),
  tipoVehiculoId: z.string().uuid().nullable().optional(),
  choferId: z.string().uuid().nullable().optional(),
  centroOrigenId: z.string().uuid().nullable().optional(),
});
export type UpdateVehicleRequest = z.infer<typeof updateVehicleSchema>;

export interface PublicVehicle {
  id: string;
  placa: string;
  modelo: string;
  capacidadCargaKg: number;
  estado: VehicleStatus;
  tipoVehiculoId: string | null;
  choferId: string | null;
  centroOrigenId: string | null;
  createdAt: string;
  updatedAt: string;
}

// --- Chofer ---

export const createDriverSchema = z.object({
  username: z.string().trim().toLowerCase().min(3).max(64),
  password: z.string().min(8).max(128),
  licencia: z.string().trim().min(1).max(50),
  telefono: z.string().trim().min(1).max(20),
});
export type CreateDriverRequest = z.infer<typeof createDriverSchema>;

export const updateDriverSchema = z.object({
  licencia: z.string().trim().min(1).max(50).optional(),
  telefono: z.string().trim().min(1).max(20).optional(),
  disponible: z.boolean().optional(),
});
export type UpdateDriverRequest = z.infer<typeof updateDriverSchema>;

export interface PublicDriver {
  id: string;
  username: string;
  licencia: string;
  telefono: string;
  disponible: boolean;
  createdAt: string;
}
