import { apiFetch } from '../lib/apiClient'
import type { Role, TeamMember } from '../auth/types'

// No orgId parameter anywhere here — the backend derives it from the
// caller's access token, so there's nothing for the client to get wrong.

export function fetchTeamMembers(): Promise<TeamMember[]> {
  return apiFetch<{ members: TeamMember[] }>('/team/members').then((r) => r.members)
}

export function inviteMember(name: string, email: string, role: Role): Promise<TeamMember> {
  return apiFetch<{ member: TeamMember }>('/team/members', {
    method: 'POST',
    body: JSON.stringify({ name, email, role }),
  }).then((r) => r.member)
}

export function updateMemberRole(memberId: string, role: Role): Promise<TeamMember> {
  return apiFetch<{ member: TeamMember }>(`/team/members/${memberId}/role`, {
    method: 'PATCH',
    body: JSON.stringify({ role }),
  }).then((r) => r.member)
}

export function removeMember(memberId: string): Promise<void> {
  return apiFetch<void>(`/team/members/${memberId}`, { method: 'DELETE' })
}
