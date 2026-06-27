import { z } from "zod";

/**
 * Identity bounded context — lenguaje compartido entre `api` y `web`.
 * Roles, y schemas de las requests de autenticación.
 */

export const ROLES = [
  "ADMIN",
  "MANAGER",
  "ZODI_SENDER",
  "ZODI_DESTINATION",
  "HUB_COORDINATOR",
  "DRIVER",
  "VOLUNTEER",
] as const;
export const roleSchema = z.enum(ROLES);
export type RoleName = z.infer<typeof roleSchema>;

export const USER_STATUSES = ["ACTIVE", "SUSPENDED"] as const;
export const userStatusSchema = z.enum(USER_STATUSES);
export type UserStatus = z.infer<typeof userStatusSchema>;

const telefonoSchema = z
  .string()
  .trim()
  .regex(/^\+?[0-9]{7,15}$/, "Debe ser un número de teléfono válido");

export const loginSchema = z.object({
  telefono: telefonoSchema,
  password: z.string().min(4).max(128),
});
export type LoginRequest = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  telefono: telefonoSchema,
  password: z.string().min(4).max(128),
  role: roleSchema,
  email: z.string().email().max(255).optional(),
});
export type RegisterRequest = z.infer<typeof registerSchema>;

export interface PublicUser {
  id: string;
  username: string;
  role: RoleName;
  email: string | null;
}

/** Payload para actualizar un usuario desde el panel admin. Todos opcionales. */
export const updateUserSchema = z
  .object({
    role: roleSchema,
    status: userStatusSchema,
    email: z.string().email().max(255).nullable(),
    password: z.string().min(4).max(128),
  })
  .partial();
export type UpdateUserRequest = z.infer<typeof updateUserSchema>;

/** Listado público de usuarios — extiende `PublicUser` con `status` y `createdAt`. */
export interface AdminUserView extends PublicUser {
  status: UserStatus;
  createdAt: string;
}

/** Auto-registro público para coordinadores de centros de acopio. */
export const documentTypeSchema = z.enum(["V", "J"]);
export type DocumentType = z.infer<typeof documentTypeSchema>;

/** El teléfono actúa como identificador único — no se pide username ni password. */
export const signupSchema = z.object({
  telefono: telefonoSchema,
  documentType: documentTypeSchema.optional(),
  cedula: z
    .string()
    .trim()
    .min(4)
    .max(20)
    .optional()
    .or(z.literal("").transform(() => undefined)),
});
export type SignupRequest = z.infer<typeof signupSchema>;

export interface SignupResult {
  user: PublicUser;
  generatedPassword: string;
}
