import type { Org, Role, User } from './types'

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

  const org: Org = { id: `org_${db.orgs.length + 1}`, name: orgName.trim() }
  const stored: StoredUser = {
    id: `user_${db.users.length + 1}`,
    orgId: org.id,
    name: name.trim(),
    email: normalizedEmail,
    role: 'owner', // the person who signs up creates the org and owns it
    password,
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
