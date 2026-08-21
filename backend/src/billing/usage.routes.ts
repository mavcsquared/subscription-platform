import { and, eq, gte, sql } from 'drizzle-orm'
import { Router } from 'express'
import { z } from 'zod'
import { requireAuth } from '../auth/middleware.js'
import { db } from '../db/index.js'
import { subscriptions, usageEvents } from '../db/schema.js'
import { ApiError } from '../errors.js'

export const usageRouter = Router()

usageRouter.use(requireAuth)

async function getSubscriptionOrThrow(orgId: string) {
  const [subscription] = await db.select().from(subscriptions).where(eq(subscriptions.orgId, orgId))
  if (!subscription) {
    throw new ApiError(404, 'No subscription found for this organization')
  }
  return subscription
}

// Periods are always monthly (no annual plans exist), so the start of
// the current period is derivable from currentPeriodEnd rather than
// needing its own stored column.
function periodStartFor(subscription: { currentPeriodEnd: Date }): Date {
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
// Viewing usage history stays allowed even when canceled — only
// recording new usage is blocked (see POST below).
usageRouter.get('/', async (req, res) => {
  const subscription = await getSubscriptionOrThrow(req.auth!.orgId)
  const used = await sumUsageSince(req.auth!.orgId, periodStartFor(subscription))
  res.json({ used })
})

const recordUsageSchema = z.object({
  quantity: z.number().int().positive().max(10_000),
})

usageRouter.post('/', async (req, res) => {
  const body = recordUsageSchema.parse(req.body)

  const subscription = await getSubscriptionOrThrow(req.auth!.orgId)
  // A canceled org has no active plan billing it for usage — unlike
  // past_due, which is still a grace period with normal access, matching
  // real dunning behavior (you don't cut off access on the first failed
  // payment, only once the subscription is actually canceled).
  if (subscription.status === 'canceled') {
    throw new ApiError(409, 'Cannot record usage for a canceled subscription — resubscribe to continue')
  }

  await db.insert(usageEvents).values({ orgId: req.auth!.orgId, quantity: body.quantity })

  const used = await sumUsageSince(req.auth!.orgId, periodStartFor(subscription))
  res.json({ used })
})
