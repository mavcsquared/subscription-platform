import type { MemberStatus, Org, Role, TeamMember, User } from './types'

/**
 * Fake backend, entirely client-side. Simulates network latency and the
 * kinds of errors a real API would return, so the UI/UX (loading states,
 * error handling) gets built against realistic conditions. Every function
 * here gets replaced by a fetch() to the real backend later; the shape of
 * the return values is what the real API is expected to match.
 *
 * The "database" persists to localStorage (not just module state) so a
 * page refresh during a demo doesn't wipe out accounts created via signup.
 */

interface StoredUser {
  id: string
  orgId: string
  name: string
  email: string
  role: Role
  password: string // plaintext in this mock only; real backend uses bcrypt
  status: MemberStatus
}

interface MockDb {
  orgs: Org[]
  users: StoredUser[]
}

const DB_KEY = 'sp_mock_db'

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
        password: 'password123',
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

function toUser(db: MockDb, stored: StoredUser): User {
  const org = db.orgs.find((o) => o.id === stored.orgId)
  return {
    id: stored.id,
    orgId: stored.orgId,
    orgName: org?.name ?? 'Unknown Org',
    name: stored.name,
    email: stored.email,
    role: stored.role,
  }
}

export async function mockLogin(email: string, password: string): Promise<User> {
  await delay()
  const db = loadDb()
  const found = db.users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase())
  if (!found || found.password !== password) {
    throw new Error('Invalid email or password')
  }
  return toUser(db, found)
}

export async function mockSignup(
  orgName: string,
  name: string,
  email: string,
  password: string,
): Promise<User> {
  await delay()
  const db = loadDb()
  const normalizedEmail = email.trim().toLowerCase()
  if (db.users.some((u) => u.email.toLowerCase() === normalizedEmail)) {
    throw new Error('An account with this email already exists')
  }

  const org: Org = { id: crypto.randomUUID(), name: orgName.trim() }
  const stored: StoredUser = {
    id: crypto.randomUUID(),
    orgId: org.id,
    name: name.trim(),
    email: normalizedEmail,
    role: 'owner', // the person who signs up creates the org and owns it
    password,
    status: 'active',
  }

  db.orgs.push(org)
  db.users.push(stored)
  saveDb(db)

  return toUser(db, stored)
}

export async function mockGetUserById(id: string): Promise<User | null> {
  const db = loadDb()
  const found = db.users.find((u) => u.id === id)
  return found ? toUser(db, found) : null
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
 * with status "invited" and no password, since there's no email step to
 * simulate.
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
    password: '',
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
