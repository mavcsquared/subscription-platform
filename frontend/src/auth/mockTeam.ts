import type { MemberStatus, Org, Role, TeamMember } from './types'

/**
 * Mock team-member store, entirely client-side. Auth itself (login,
 * signup, sessions) now talks to the real backend — this file is what's
 * left: team management (invite/role-change/remove), not yet wired up.
 * Its data is a separate localStorage-backed "database", unrelated to
 * whoever is actually logged in via the real backend.
 */

interface StoredUser {
  id: string
  orgId: string
  name: string
  email: string
  role: Role
  status: MemberStatus
}

interface MockDb {
  orgs: Org[]
  users: StoredUser[]
}

const DB_KEY = 'sp_mock_team_db'

function seedDb(): MockDb {
  return {
    orgs: [{ id: 'org_1', name: 'Acme Inc' }],
    users: [
      {
        id: 'user_1',
        orgId: 'org_1',
        name: 'Ana Owner',
        email: 'owner@acme.test',
        role: 'owner',
        status: 'active',
      },
    ],
  }
}

function loadDb(): MockDb {
  const raw = localStorage.getItem(DB_KEY)
  if (!raw) {
    const seeded = seedDb()
    localStorage.setItem(DB_KEY, JSON.stringify(seeded))
    return seeded
  }
  return JSON.parse(raw) as MockDb
}

function saveDb(db: MockDb) {
  localStorage.setItem(DB_KEY, JSON.stringify(db))
}

function delay(ms = 400) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function toTeamMember(stored: StoredUser): TeamMember {
  return {
    id: stored.id,
    name: stored.name,
    email: stored.email,
    role: stored.role,
    status: stored.status,
  }
}

export async function mockListTeamMembers(orgId: string): Promise<TeamMember[]> {
  await delay(250)
  const db = loadDb()
  return db.users.filter((u) => u.orgId === orgId).map(toTeamMember)
}

/**
 * Stands in for a real invite flow (which would email a token and let the
 * invitee set their own password). Here the member is created immediately
 * with status "invited", since there's no email step to simulate.
 */
export async function mockInviteMember(
  orgId: string,
  name: string,
  email: string,
  role: Role,
): Promise<TeamMember> {
  await delay()
  const db = loadDb()
  const normalizedEmail = email.trim().toLowerCase()
  if (db.users.some((u) => u.email.toLowerCase() === normalizedEmail)) {
    throw new Error('An account with this email already exists')
  }

  const stored: StoredUser = {
    id: crypto.randomUUID(),
    orgId,
    name: name.trim(),
    email: normalizedEmail,
    role,
    status: 'invited',
  }
  db.users.push(stored)
  saveDb(db)

  return toTeamMember(stored)
}

export async function mockUpdateMemberRole(userId: string, role: Role): Promise<TeamMember> {
  await delay(250)
  const db = loadDb()
  const found = db.users.find((u) => u.id === userId)
  if (!found) throw new Error('Member not found')
  if (found.role === 'owner') throw new Error("The org owner's role can't be changed")
  if (role === 'owner') throw new Error('Ownership transfer is not supported')

  found.role = role
  saveDb(db)
  return toTeamMember(found)
}

export async function mockRemoveMember(userId: string): Promise<void> {
  await delay(250)
  const db = loadDb()
  const found = db.users.find((u) => u.id === userId)
  if (!found) throw new Error('Member not found')
  if (found.role === 'owner') throw new Error("The org owner can't be removed")

  db.users = db.users.filter((u) => u.id !== userId)
  saveDb(db)
}
