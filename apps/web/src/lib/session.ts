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
export const ROLES_MANAGE_NEEDS: RoleName[] = ['ADMIN', 'ZODI_SENDER', 'ZODI_DESTINATION']

/** Roles autorizados para gestionar usuarios del sistema. */
export const ROLES_MANAGE_USERS: RoleName[] = ['ADMIN']

/** Roles autorizados para gestionar emergencias (incidencias). */
export const ROLES_MANAGE_INCIDENTS: RoleName[] = ['ADMIN', 'MANAGER']

/** Roles autorizados para gestionar centros de acopio (hubs). */
export const ROLES_MANAGE_HUBS: RoleName[] = ['ADMIN', 'MANAGER', 'ZODI_SENDER']

/**
 * Roles autorizados a entrar a la pantalla de Logística. Los coordinadores de
 * centro acceden con vista filtrada (solo sus propios hubs), los demás ven y
 * gestionan todos los centros.
 */
export const ROLES_VIEW_LOGISTICS: RoleName[] = [
  'ADMIN',
  'MANAGER',
  'ZODI_SENDER',
  'HUB_COORDINATOR',
]

/**
 * Roles "internos" de SOS Logística que pueden verificar / activar / desactivar
 * un centro de acopio. Cualquier otro rol (incluyendo HUB_COORDINATOR) que
 * intente operar sobre un hub INACTIVO debe ver la pantalla de verificación
 * pendiente en lugar de poder activarlo por su cuenta.
 */
export const ROLES_VERIFY_HUBS: RoleName[] = [
  'ADMIN',
  'MANAGER',
  'ZODI_SENDER',
  'ZODI_DESTINATION',
]

/** Roles autorizados para gestionar la flota (choferes, vehículos). */
export const ROLES_MANAGE_FLEET: RoleName[] = ['ADMIN', 'MANAGER']

/**
 * Roles autorizados para gestionar caravanas (convoys). El backend restringe
 * la planificación, despacho, completado y cancelación a `ZODI_SENDER`, y el
 * selector de escolta solo es accesible para ese rol.
 */
export const ROLES_MANAGE_CONVOYS: RoleName[] = ['ZODI_SENDER', 'ADMIN']

/** Roles autorizados para entrar al panel admin (vista). */
export const ROLES_VIEW_ADMIN: RoleName[] = [
  'ADMIN',
  'MANAGER',
  'HUB_COORDINATOR',
  'ZODI_SENDER',
]
