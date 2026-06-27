import { z } from "zod";

export const VEHICLE_STATUSES = ["DISPONIBLE", "EN_RUTA", "FUERA_DE_SERVICIO"] as const;
export const vehicleStatusSchema = z.enum(VEHICLE_STATUSES);
export type VehicleStatus = z.infer<typeof vehicleStatusSchema>;

// --- Tipo de Vehículo ---

export const createVehicleTypeSchema = z.object({
  nombre: z
    .string({ required_error: "El nombre es requerido" })
    .trim()
    .min(1, "El nombre es requerido")
    .max(80, "Máximo 80 caracteres"),
  descripcion: z.string().trim().max(255, "Máximo 255 caracteres").default(""),
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
  placa: z
    .string({ required_error: "La placa es requerida" })
    .trim()
    .min(1, "La placa es requerida")
    .max(20, "Máximo 20 caracteres"),
  modelo: z
    .string({ required_error: "El modelo es requerido" })
    .trim()
    .min(1, "El modelo es requerido")
    .max(100, "Máximo 100 caracteres"),
  capacidadCargaKg: z
    .number({ required_error: "La capacidad es requerida", invalid_type_error: "Debe ser un número" })
    .positive("Debe ser mayor que cero"),
  tipoVehiculoId: z.string().uuid("Identificador inválido").optional(),
  choferId: z.string().uuid("Identificador inválido").optional(),
  centroOrigenId: z.string().uuid("Identificador inválido").optional(),
});
export type CreateVehicleRequest = z.infer<typeof createVehicleSchema>;

export const updateVehicleSchema = z.object({
  placa: z.string().trim().min(1, "La placa es requerida").max(20, "Máximo 20 caracteres").optional(),
  modelo: z.string().trim().min(1, "El modelo es requerido").max(100, "Máximo 100 caracteres").optional(),
  capacidadCargaKg: z.number({ invalid_type_error: "Debe ser un número" }).positive("Debe ser mayor que cero").optional(),
  estado: vehicleStatusSchema.optional(),
  tipoVehiculoId: z.string().uuid("Identificador inválido").nullable().optional(),
  choferId: z.string().uuid("Identificador inválido").nullable().optional(),
  centroOrigenId: z.string().uuid("Identificador inválido").nullable().optional(),
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
  nombre: z
    .string({ required_error: "El nombre es requerido" })
    .trim()
    .min(1, "El nombre es requerido")
    .max(80, "Máximo 80 caracteres"),
  apellido: z
    .string({ required_error: "El apellido es requerido" })
    .trim()
    .min(1, "El apellido es requerido")
    .max(80, "Máximo 80 caracteres"),
  cedula: z
    .string({ required_error: "La cédula es requerida" })
    .trim()
    .min(4, "Mínimo 4 caracteres")
    .max(20, "Máximo 20 caracteres"),
  licencia: z
    .string({ required_error: "La licencia es requerida" })
    .trim()
    .min(1, "La licencia es requerida")
    .max(50, "Máximo 50 caracteres"),
  telefono: z
    .string({ required_error: "El teléfono es requerido" })
    .trim()
    .min(7, "Mínimo 7 dígitos")
    .max(20, "Máximo 20 caracteres"),
});
export type CreateDriverRequest = z.infer<typeof createDriverSchema>;

export const updateDriverSchema = z.object({
  nombre: z.string().trim().min(1, "El nombre es requerido").max(80, "Máximo 80 caracteres").optional(),
  apellido: z.string().trim().min(1, "El apellido es requerido").max(80, "Máximo 80 caracteres").optional(),
  licencia: z.string().trim().min(1, "La licencia es requerida").max(50, "Máximo 50 caracteres").optional(),
  telefono: z.string().trim().min(7, "Mínimo 7 dígitos").max(20, "Máximo 20 caracteres").optional(),
  disponible: z.boolean().optional(),
});
export type UpdateDriverRequest = z.infer<typeof updateDriverSchema>;

export interface PublicDriver {
  id: string;
  nombre: string;
  apellido: string;
  cedula: string;
  licencia: string;
  telefono: string;
  disponible: boolean;
  createdAt: string;
}
