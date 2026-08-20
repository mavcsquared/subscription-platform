import { and, eq, gte, sql } from 'drizzle-orm'
import { Router } from 'express'
import { z } from 'zod'
import { requireAuth } from '../auth/middleware.js'
import { db } from '../db/index.js'
import { subscriptions, usageEvents } from '../db/schema.js'
import { ApiError } from '../errors.js'

export const usageRouter = Router()

usageRouter.use(requireAuth)

// Periods are always monthly (no annual plans exist), so the start of
// the current period is derivable from currentPeriodEnd rather than
// needing its own stored column.
async function currentPeriodStart(orgId: string): Promise<Date> {
  const [subscription] = await db.select().from(subscriptions).where(eq(subscriptions.orgId, orgId))
  if (!subscription) {
    throw new ApiError(404, 'No subscription found for this organization')
  }
  const periodStart = new Date(subscription.currentPeriodEnd)
  periodStart.setMonth(periodStart.getMonth() - 1)
  return periodStart
}

async function sumUsageSince(orgId: string, since: Date): Promise<number> {
  const [row] = await db
    .select({ total: sql<number>`coalesce(sum(${usageEvents.quantity}), 0)` })
    .from(usageEvents)
    .where(and(eq(usageEvents.orgId, orgId), gte(usageEvents.occurredAt, since)))
  return Number(row?.total ?? 0)
}

// No role restriction — unlike changing the plan, usage is meant to
// come from any authenticated activity in the org, not just owners/admins.
usageRouter.get('/', async (req, res) => {
  const since = await currentPeriodStart(req.auth!.orgId)
  const used = await sumUsageSince(req.auth!.orgId, since)
  res.json({ used })
})

const recordUsageSchema = z.object({
  quantity: z.number().int().positive().max(10_000),
})

usageRouter.post('/', async (req, res) => {
  const body = recordUsageSchema.parse(req.body)

  await db.insert(usageEvents).values({ orgId: req.auth!.orgId, quantity: body.quantity })

  const since = await currentPeriodStart(req.auth!.orgId)
  const used = await sumUsageSince(req.auth!.orgId, since)
  res.json({ used })
})
