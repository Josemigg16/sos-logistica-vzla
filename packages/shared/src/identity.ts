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

export const loginSchema = z.object({
  username: z.string().trim().toLowerCase().min(3).max(64),
  password: z.string().min(8).max(128),
});
export type LoginRequest = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  username: z.string().trim().toLowerCase().min(3).max(64),
  password: z.string().min(8).max(128),
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
