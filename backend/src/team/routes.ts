import { and, eq } from 'drizzle-orm'
import { Router } from 'express'
import { z } from 'zod'
import { requireAuth, requireRole } from '../auth/middleware.js'
import { canManageMember } from '../auth/permissions.js'
import { db } from '../db/index.js'
import { users } from '../db/schema.js'
import { ApiError } from '../errors.js'

export const teamRouter = Router()

teamRouter.use(requireAuth)

function toTeamMember(user: typeof users.$inferSelect) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
  }
}

function isUniqueViolation(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: string }).code === '23505'
}

// Any authenticated member of the org can view the list (matches the
// frontend, which shows a read-only view to "member" role).
teamRouter.get('/members', async (req, res) => {
  const members = await db.select().from(users).where(eq(users.orgId, req.auth!.orgId))
  res.json({ members: members.map(toTeamMember) })
})

const inviteSchema = z.object({
  name: z.string().trim().min(1).max(200),
  email: z.string().trim().toLowerCase().email(),
  role: z.enum(['admin', 'member']),
})

// Stands in for a real invite flow (would email a token and let the
// invitee set their own password). Created immediately with status
// "invited" and no password — matches the frontend mock this replaces.
teamRouter.post('/members', requireRole('owner', 'admin'), async (req, res) => {
  const body = inviteSchema.parse(req.body)

  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, body.email))
  if (existing) {
    throw new ApiError(409, 'An account with this email already exists')
  }

  let created: typeof users.$inferSelect
  try {
    const [inserted] = await db
      .insert(users)
      .values({
        orgId: req.auth!.orgId,
        name: body.name,
        email: body.email,
        role: body.role,
        status: 'invited',
      })
      .returning()
    created = inserted
  } catch (err) {
    if (isUniqueViolation(err)) {
      throw new ApiError(409, 'An account with this email already exists')
    }
    throw err
  }

  res.status(201).json({ member: toTeamMember(created) })
})

const roleUpdateSchema = z.object({
  role: z.enum(['admin', 'member']),
})

teamRouter.patch('/members/:id/role', requireRole('owner', 'admin'), async (req, res) => {
  const body = roleUpdateSchema.parse(req.body)

  // req.params.id types as `string | string[]` here (an Express 5 quirk
  // when a route has multiple handlers), so extract it explicitly.
  const memberId = req.params.id as string

  // Scoped by org_id at the query level: a request for another org's
  // user id 404s here rather than ever loading that row into memory.
  const [target] = await db
    .select()
    .from(users)
    .where(and(eq(users.id, memberId), eq(users.orgId, req.auth!.orgId)))

  if (!target) {
    throw new ApiError(404, 'Member not found')
  }

  const isSelf = target.id === req.auth!.sub
  if (!canManageMember(req.auth!.role, target.role, isSelf)) {
    throw new ApiError(403, "You do not have permission to change this member's role")
  }

  const [updated] = await db.update(users).set({ role: body.role }).where(eq(users.id, target.id)).returning()

  res.json({ member: toTeamMember(updated) })
})

teamRouter.delete('/members/:id', requireRole('owner', 'admin'), async (req, res) => {
  const memberId = req.params.id as string

  const [target] = await db
    .select()
    .from(users)
    .where(and(eq(users.id, memberId), eq(users.orgId, req.auth!.orgId)))

  if (!target) {
    throw new ApiError(404, 'Member not found')
  }

  const isSelf = target.id === req.auth!.sub
  if (!canManageMember(req.auth!.role, target.role, isSelf)) {
    throw new ApiError(403, 'You do not have permission to remove this member')
  }

  await db.delete(users).where(eq(users.id, target.id))
  res.status(204).end()
})
