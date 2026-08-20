import { eq } from 'drizzle-orm'
import { Router } from 'express'
import { z } from 'zod'
import { requireAuth, requireRole } from '../auth/middleware.js'
import { db } from '../db/index.js'
import { billingEvents, plans, subscriptions } from '../db/schema.js'
import { ApiError } from '../errors.js'

export const subscriptionRouter = Router()

subscriptionRouter.use(requireAuth)

subscriptionRouter.get('/subscription', async (req, res) => {
  const [subscription] = await db.select().from(subscriptions).where(eq(subscriptions.orgId, req.auth!.orgId))
  if (!subscription) {
    throw new ApiError(404, 'No subscription found for this organization')
  }
  res.json({ subscription })
})

const changePlanSchema = z.object({
  planId: z.string(),
})

subscriptionRouter.post('/subscription', requireRole('owner', 'admin'), async (req, res) => {
  const body = changePlanSchema.parse(req.body)

  const [plan] = await db.select().from(plans).where(eq(plans.id, body.planId))
  if (!plan) {
    throw new ApiError(400, 'Unknown plan')
  }

  // Preserves the existing currentPeriodEnd — switching plans mid-cycle
  // doesn't reset the billing date, matching how Stripe subscription
  // updates actually behave.
  const [updated] = await db
    .update(subscriptions)
    .set({ planId: plan.id, status: 'active', updatedAt: new Date() })
    .where(eq(subscriptions.orgId, req.auth!.orgId))
    .returning()

  if (!updated) {
    throw new ApiError(404, 'No subscription found for this organization')
  }

  await db.insert(billingEvents).values({
    orgId: req.auth!.orgId,
    type: 'customer.subscription.updated',
    payload: { planId: plan.id, planName: plan.name },
  })

  res.json({ subscription: updated })
})
