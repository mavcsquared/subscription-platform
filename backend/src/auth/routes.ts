import { eq } from 'drizzle-orm'
import { Router, type Response } from 'express'
import { z } from 'zod'
import { isProduction } from '../config.js'
import { db } from '../db/index.js'
import { orgs, subscriptions, users } from '../db/schema.js'
import { ApiError } from '../errors.js'
import { oneMonthFromNow } from '../lib/dates.js'
import { requireAuth } from './middleware.js'
import { hashPassword, verifyPassword } from './password.js'
import { createSession, findValidSession, revokeSessionById, revokeSessionByToken } from './sessions.js'
import { REFRESH_TOKEN_TTL_MS, signAccessToken } from './tokens.js'

export const authRouter = Router()

const REFRESH_COOKIE = 'refresh_token'

function setRefreshCookie(res: Response, token: string) {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: isProduction,
    // 'none' is required for the cookie to be sent on cross-site
    // requests (frontend and backend are on different domains in
    // production) — 'none' only works with secure:true, which is only
    // available over HTTPS, hence 'lax' for local HTTP dev.
    sameSite: isProduction ? 'none' : 'lax',
    // Scoped to /auth so the browser doesn't attach this cookie to every
    // API request — only the endpoints that actually need it.
    path: '/auth',
    maxAge: REFRESH_TOKEN_TTL_MS,
  })
}

function clearRefreshCookie(res: Response) {
  res.clearCookie(REFRESH_COOKIE, { path: '/auth' })
}

function isUniqueViolation(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: string }).code === '23505'
}

const signupSchema = z.object({
  orgName: z.string().trim().min(1).max(200),
  name: z.string().trim().min(1).max(200),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).max(200),
})

authRouter.post('/signup', async (req, res) => {
  const body = signupSchema.parse(req.body)

  // Fast pre-check so we don't waste an argon2 hash (deliberately slow)
  // on a request that's certain to fail. The unique constraint on
  // users.email is the real guarantee against a concurrent duplicate.
  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, body.email))
  if (existing) {
    throw new ApiError(409, 'An account with this email already exists')
  }

  const passwordHash = await hashPassword(body.password)

  let created: { user: typeof users.$inferSelect; org: typeof orgs.$inferSelect }
  try {
    created = await db.transaction(async (tx) => {
      const [org] = await tx.insert(orgs).values({ name: body.orgName }).returning()
      const [user] = await tx
        .insert(users)
        .values({
          orgId: org.id,
          name: body.name,
          email: body.email,
          passwordHash,
          role: 'owner', // the person who signs up creates the org and owns it
          status: 'active',
        })
        .returning()
      await tx.insert(subscriptions).values({
        orgId: org.id,
        planId: 'starter',
        status: 'active',
        currentPeriodEnd: oneMonthFromNow(),
      })
      return { user, org }
    })
  } catch (err) {
    if (isUniqueViolation(err)) {
      throw new ApiError(409, 'An account with this email already exists')
    }
    throw err
  }

  const { user, org } = created
  const accessToken = signAccessToken({ sub: user.id, orgId: org.id, role: user.role })
  const refreshToken = await createSession(user.id)
  setRefreshCookie(res, refreshToken)

  res.status(201).json({
    accessToken,
    user: {
      id: user.id,
      orgId: org.id,
      orgName: org.name,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  })
})

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
})

authRouter.post('/login', async (req, res) => {
  const body = loginSchema.parse(req.body)

  const [row] = await db
    .select({ user: users, orgName: orgs.name })
    .from(users)
    .innerJoin(orgs, eq(users.orgId, orgs.id))
    .where(eq(users.email, body.email))

  // Same generic error whether the email doesn't exist, the account has
  // no password yet (an invited member who hasn't accepted), or the
  // password is wrong — anything more specific leaks account state to
  // an attacker probing emails.
  if (!row || !row.user.passwordHash || !(await verifyPassword(row.user.passwordHash, body.password))) {
    throw new ApiError(401, 'Invalid email or password')
  }

  const accessToken = signAccessToken({ sub: row.user.id, orgId: row.user.orgId, role: row.user.role })
  const refreshToken = await createSession(row.user.id)
  setRefreshCookie(res, refreshToken)

  res.json({
    accessToken,
    user: {
      id: row.user.id,
      orgId: row.user.orgId,
      orgName: row.orgName,
      name: row.user.name,
      email: row.user.email,
      role: row.user.role,
    },
  })
})

authRouter.post('/refresh', async (req, res) => {
  const token = req.cookies?.[REFRESH_COOKIE] as string | undefined
  if (!token) {
    throw new ApiError(401, 'Missing refresh token')
  }

  const session = await findValidSession(token)
  if (!session) {
    clearRefreshCookie(res)
    throw new ApiError(401, 'Invalid or expired refresh token')
  }

  const [user] = await db.select().from(users).where(eq(users.id, session.userId))
  if (!user) {
    await revokeSessionById(session.id)
    clearRefreshCookie(res)
    throw new ApiError(401, 'Invalid or expired refresh token')
  }

  // Rotate: the presented refresh token is single-use. Limits the blast
  // radius if a token is ever stolen and replayed.
  await revokeSessionById(session.id)
  const newRefreshToken = await createSession(user.id)
  setRefreshCookie(res, newRefreshToken)

  const accessToken = signAccessToken({ sub: user.id, orgId: user.orgId, role: user.role })
  res.json({ accessToken })
})

authRouter.post('/logout', async (req, res) => {
  const token = req.cookies?.[REFRESH_COOKIE] as string | undefined
  if (token) {
    await revokeSessionByToken(token)
  }
  clearRefreshCookie(res)
  res.status(204).end()
})

authRouter.get('/me', requireAuth, async (req, res) => {
  const [row] = await db
    .select({ user: users, orgName: orgs.name })
    .from(users)
    .innerJoin(orgs, eq(users.orgId, orgs.id))
    .where(eq(users.id, req.auth!.sub))

  if (!row) {
    throw new ApiError(401, 'User not found')
  }

  res.json({
    user: {
      id: row.user.id,
      orgId: row.user.orgId,
      orgName: row.orgName,
      name: row.user.name,
      email: row.user.email,
      role: row.user.role,
    },
  })
})
