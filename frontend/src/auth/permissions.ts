import type { Role } from './types'

/**
 * Single source of truth for "who can change/remove whom" on the team
 * screen. The same rule (not just this function) needs to be enforced
 * server-side once the backend exists — this only controls what the UI
 * shows.
 */
export function canManageMember(actingRole: Role, targetRole: Role, isSelf: boolean): boolean {
  if (isSelf) return false
  if (targetRole === 'owner') return false
  if (actingRole === 'owner') return true
  if (actingRole === 'admin') return targetRole === 'member'
  return false
}

/**
 * Shared "is this role privileged enough" check, used to gate inviting
 * members, changing plans, and managing billing — all three are
 * currently the same owner/admin rule.
 */
export function isOwnerOrAdmin(role: Role): boolean {
  return role === 'owner' || role === 'admin'
}
