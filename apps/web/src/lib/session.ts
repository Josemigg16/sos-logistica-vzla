import type { RoleName } from '@sos/shared'
import type { SessionUser } from './auth/auth-client'

/**
 * Helpers de autorización por rol. La fuente de verdad es `AuthProvider`
 * (`useAuth()`); estas utilidades solo facilitan checks declarativos.
 */

export function hasAnyRole(user: SessionUser | null, ...roles: RoleName[]): boolean {
  if (!user) return false
  return roles.includes(user.role)
}

/** Roles autorizados para gestionar necesidades del panel público. */
export const ROLES_MANAGE_NEEDS: RoleName[] = ['ADMIN', 'ZODI_DESTINATION']

/** Roles autorizados para gestionar centros de acopio (hubs). */
export const ROLES_MANAGE_HUBS: RoleName[] = ['ADMIN', 'MANAGER']

/** Roles autorizados para entrar al panel admin (vista). */
export const ROLES_VIEW_ADMIN: RoleName[] = [
  'ADMIN',
  'MANAGER',
  'HUB_COORDINATOR',
  'ZODI_DESTINATION',
]
