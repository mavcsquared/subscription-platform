import { desc, eq } from 'drizzle-orm'
import { Router } from 'express'
import { z } from 'zod'
import { requireAuth, requireRole } from '../auth/middleware.js'
import { db } from '../db/index.js'
import { billingEvents, plans, subscriptions } from '../db/schema.js'
import { ApiError } from '../errors.js'
import { applyBillingEvent, summarizeBillingEvent } from './events.js'

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

subscriptionRouter.get('/events', async (req, res) => {
  const events = await db
    .select()
    .from(billingEvents)
    .where(eq(billingEvents.orgId, req.auth!.orgId))
    .orderBy(desc(billingEvents.createdAt))

  res.json({
    events: events.map((e) => ({
      id: e.id,
      orgId: e.orgId,
      type: e.type,
      createdAt: e.createdAt,
      summary: summarizeBillingEvent(e.type, e.payload),
    })),
  })
})

const simulateSchema = z.object({
  event: z.enum(['invoice.payment_succeeded', 'invoice.payment_failed', 'customer.subscription.deleted']),
})

// Authenticated counterpart to the real webhook endpoint (webhook.routes.ts) —
// what the UI's "Simulate ..." buttons actually call. Both go through the
// same applyBillingEvent(), just with different authentication appropriate
// to who's calling: a logged-in owner/admin here, a shared secret there.
subscriptionRouter.post('/simulate', requireRole('owner', 'admin'), async (req, res) => {
  const body = simulateSchema.parse(req.body)
  const event = await applyBillingEvent(req.auth!.orgId, body.event)
  res.status(201).json({
    event: {
      id: event.id,
      type: event.type,
      createdAt: event.createdAt,
      summary: summarizeBillingEvent(event.type, event.payload),
    },
  })
})
