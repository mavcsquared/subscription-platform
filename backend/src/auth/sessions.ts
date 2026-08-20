import { eq } from 'drizzle-orm'
import { db } from '../db/index.js'
import { sessions } from '../db/schema.js'
import { generateRefreshToken, hashRefreshToken, REFRESH_TOKEN_TTL_MS } from './tokens.js'

export async function createSession(userId: string): Promise<string> {
  const token = generateRefreshToken()
  await db.insert(sessions).values({
    userId,
    tokenHash: hashRefreshToken(token),
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
  })
  return token
}

export async function findValidSession(token: string) {
  const tokenHash = hashRefreshToken(token)
  const [session] = await db.select().from(sessions).where(eq(sessions.tokenHash, tokenHash))
  if (!session || session.expiresAt < new Date()) return null
  return session
}

export async function revokeSessionById(id: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.id, id))
}

export async function revokeSessionByToken(token: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.tokenHash, hashRefreshToken(token)))
}
