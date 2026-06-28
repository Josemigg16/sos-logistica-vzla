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

const telefonoSchema = z.preprocess((val) => {
  if (typeof val !== "string") return val;

  // Guardamos si empezaba con '+'
  const hasPlus = val.trim().startsWith("+");

  // Eliminamos espacios y símbolos comunes (guiones, paréntesis, puntos, barras, guiones bajos, comas)
  let digits = val.replace(/[\s\-\(\)\.\/\_\,]/g, "");

  // Si guardamos el '+', nos aseguramos de que empiece con '+'
  if (hasPlus && !digits.startsWith("+")) {
    digits = "+" + digits.replace(/\+/g, "");
  }

  let cleaned = digits;
  if (!cleaned.startsWith("+")) {
    // Si empieza con '0' y tiene 11 dígitos (ej: 04145154966), quitamos el '0' y ponemos '+58'
    if (cleaned.startsWith("0") && cleaned.length === 11) {
      cleaned = "+58" + cleaned.slice(1);
    }
    // Si tiene 10 dígitos y empieza con 4 o 2 (ej: 4145154966), ponemos '+58'
    else if (cleaned.length === 10 && (cleaned.startsWith("4") || cleaned.startsWith("2"))) {
      cleaned = "+58" + cleaned;
    }
    // Si empieza con '58' pero sin '+', le agregamos el '+'
    else if (cleaned.startsWith("58") && (cleaned.length === 12 || cleaned.length === 13)) {
      cleaned = "+" + cleaned;
    }
  }
  return cleaned;
}, z.string().trim().regex(/^\+?[0-9]{7,15}$/, "Debe ser un número de teléfono válido"));

export const loginSchema = z.object({
  telefono: z.union([z.literal("admin"), telefonoSchema]),
  password: z.string().min(5, "La contraseña debe tener al menos 5 caracteres").max(128, "La contraseña no puede superar los 128 caracteres"),
});
export type LoginRequest = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  telefono: telefonoSchema,
  password: z.string().min(5, "La contraseña debe tener al menos 5 caracteres").max(128, "La contraseña no puede superar los 128 caracteres"),
  role: roleSchema,
  email: z.string().email("Debe ser un correo electrónico válido").max(255, "El correo no puede superar los 255 caracteres").optional(),
});
export type RegisterRequest = z.infer<typeof registerSchema>;

export interface PublicUser {
  id: string;
  username: string;
  role: RoleName;
  email: string | null;
  telefono: string | null;
}

/** Payload para actualizar un usuario desde el panel admin. Todos opcionales. */
export const updateUserSchema = z
  .object({
    role: roleSchema,
    status: userStatusSchema,
    email: z.string().email("Debe ser un correo electrónico válido").max(255, "El correo no puede superar los 255 caracteres").nullable(),
    password: z.string().min(5, "La contraseña debe tener al menos 5 caracteres").max(128, "La contraseña no puede superar los 128 caracteres"),
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

/** El teléfono actúa como identificador único. La contraseña es opcional — si no
 *  se proporciona, el backend genera una automáticamente. */
export const signupSchema = z.object({
  telefono: telefonoSchema,
  documentType: documentTypeSchema.optional(),
  cedula: z
    .string()
    .trim()
    .min(4, "La cédula debe tener al menos 4 caracteres")
    .max(20, "La cédula no puede superar los 20 caracteres")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  password: z.string().min(5, "La contraseña debe tener al menos 5 caracteres").max(128).optional(),
});
export type SignupRequest = z.infer<typeof signupSchema>;

export interface SignupResult {
  user: PublicUser;
  /** `null` cuando el coordinador eligió su propia contraseña. */
  generatedPassword: string | null;
}
