import { useEffect, useState, type FormEvent } from 'react'
import { useAuth } from '../auth/AuthContext'
import {
  mockInviteMember,
  mockListTeamMembers,
  mockRemoveMember,
  mockUpdateMemberRole,
} from '../auth/mockAuth'
import { canManageMember, isOwnerOrAdmin } from '../auth/permissions'
import type { Role, TeamMember } from '../auth/types'
import { AppHeader } from '../components/AppHeader'

const roleLabels: Record<Role, string> = {
  owner: 'Owner',
  admin: 'Admin',
  member: 'Member',
}

export function TeamPage() {
  const { user } = useAuth()
  const [members, setMembers] = useState<TeamMember[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)

  const [isInviteOpen, setIsInviteOpen] = useState(false)
  const [inviteName, setInviteName] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<Role>('member')
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [isInviting, setIsInviting] = useState(false)

  const canInvite = user ? isOwnerOrAdmin(user.role) : false

  useEffect(() => {
    if (!user) return
    mockListTeamMembers(user.orgId).then((fetched) => {
      setMembers(fetched)
      setIsLoading(false)
    })
  }, [user])

  async function handleInvite(e: FormEvent) {
    e.preventDefault()
    if (!user) return
    setInviteError(null)
    setIsInviting(true)
    try {
      const newMember = await mockInviteMember(user.orgId, inviteName, inviteEmail, inviteRole)
      setMembers((prev) => [...prev, newMember])
      setInviteName('')
      setInviteEmail('')
      setInviteRole('member')
      setIsInviteOpen(false)
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setIsInviting(false)
    }
  }

  async function handleRoleChange(memberId: string, role: Role) {
    setBusyId(memberId)
    try {
      const updated = await mockUpdateMemberRole(memberId, role)
      setMembers((prev) => prev.map((m) => (m.id === memberId ? updated : m)))
    } finally {
      setBusyId(null)
    }
  }

  async function handleRemove(member: TeamMember) {
    if (!window.confirm(`Remove ${member.name} from the team?`)) return
    setBusyId(member.id)
    try {
      await mockRemoveMember(member.id)
      setMembers((prev) => prev.filter((m) => m.id !== member.id))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader />

      <main className="mx-auto max-w-4xl px-4 py-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-slate-900">Team</h1>
            <p className="mt-1 text-sm text-slate-500">People with access to {user?.orgName}.</p>
          </div>
          {canInvite && (
            <button
              onClick={() => setIsInviteOpen((open) => !open)}
              className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500"
            >
              {isInviteOpen ? 'Cancel' : 'Invite member'}
            </button>
          )}
        </div>

        {!canInvite && (
          <p className="mt-2 text-sm text-amber-600">
            Only owners and admins can manage the team — you can view it as a member.
          </p>
        )}

        {isInviteOpen && (
          <form
            onSubmit={handleInvite}
            className="mt-4 space-y-3 rounded-lg border border-slate-200 bg-white p-4"
          >
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label htmlFor="inviteName" className="block text-sm font-medium text-slate-700">
                  Name
                </label>
                <input
                  id="inviteName"
                  required
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label htmlFor="inviteEmail" className="block text-sm font-medium text-slate-700">
                  Email
                </label>
                <input
                  id="inviteEmail"
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label htmlFor="inviteRole" className="block text-sm font-medium text-slate-700">
                  Role
                </label>
                <select
                  id="inviteRole"
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as Role)}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>

            {inviteError && <p className="text-sm text-red-600">{inviteError}</p>}

            <button
              type="submit"
              disabled={isInviting}
              className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-60"
            >
              {isInviting ? 'Sending invite…' : 'Send invite'}
            </button>
          </form>
        )}

        <div className="mt-6 overflow-hidden rounded-lg border border-slate-200 bg-white">
          {isLoading ? (
            <p className="p-6 text-sm text-slate-400">Loading team…</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {members.map((member) => {
                  const isSelf = member.id === user?.id
                  const manageable = user ? canManageMember(user.role, member.role, isSelf) : false
                  return (
                    <tr key={member.id}>
                      <td className="px-4 py-3 text-slate-900">
                        {member.name} {isSelf && <span className="text-slate-400">(you)</span>}
                      </td>
                      <td className="px-4 py-3 text-slate-500">{member.email}</td>
                      <td className="px-4 py-3">
                        {manageable ? (
                          <select
                            value={member.role}
                            disabled={busyId === member.id}
                            onChange={(e) => handleRoleChange(member.id, e.target.value as Role)}
                            className="rounded-md border border-slate-300 px-2 py-1 text-sm disabled:opacity-60"
                          >
                            <option value="member">Member</option>
                            <option value="admin">Admin</option>
                          </select>
                        ) : (
                          <span className="text-slate-700">{roleLabels[member.role]}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            member.status === 'invited'
                              ? 'bg-amber-50 text-amber-600'
                              : 'bg-emerald-50 text-emerald-600'
                          }`}
                        >
                          {member.status === 'invited' ? 'Invited' : 'Active'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {manageable ? (
                          <button
                            onClick={() => handleRemove(member)}
                            disabled={busyId === member.id}
                            className="text-sm font-medium text-red-600 hover:text-red-500 disabled:opacity-60"
                          >
                            Remove
                          </button>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  )
}
