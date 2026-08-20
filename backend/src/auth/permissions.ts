import type { Role } from '../db/schema.js'

/**
 * Mirrors frontend/src/auth/permissions.ts exactly. The frontend's copy
 * only controls what the UI shows; this one is the actual enforcement —
 * every team route re-checks this server-side regardless of what the
 * client sent.
 */
export function canManageMember(actingRole: Role, targetRole: Role, isSelf: boolean): boolean {
  if (isSelf) return false
  if (targetRole === 'owner') return false
  if (actingRole === 'owner') return true
  if (actingRole === 'admin') return targetRole === 'member'
  return false
}

export function isOwnerOrAdmin(role: Role): boolean {
  return role === 'owner' || role === 'admin'
}
