import type { RoleName } from '@sos/shared'

/**
 * Mock session of the current user.
 * Replace with the real /auth/me integration when login is wired up.
 */
export interface SessionUser {
  id: string
  username: string
  role: RoleName
}

const MOCK_USER: SessionUser = {
  id: 'mock-admin-001',
  username: 'admin',
  role: 'ADMIN',
}

export function getCurrentUser(): SessionUser | null {
  return MOCK_USER
}

export function hasAnyRole(user: SessionUser | null, ...roles: RoleName[]): boolean {
  if (!user) return false
  return roles.includes(user.role)
}

/** Roles authorized to manage needs shown in the public panel. */
export const ROLES_MANAGE_NEEDS: RoleName[] = ['ADMIN', 'ZODI_DESTINATION']
