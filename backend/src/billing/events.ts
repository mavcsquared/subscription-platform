import { eq } from 'drizzle-orm'
import { db } from '../db/index.js'
import { billingEvents, plans, subscriptions } from '../db/schema.js'
import { ApiError } from '../errors.js'

/**
 * type is stored as plain text in the DB (not a Postgres enum) — matches
 * how Stripe's own event `type` field works: an open string, with the
 * API layer deciding which values are meaningful. This union is an
 * application-level constraint only, mirroring frontend/src/billing/types.ts.
 */
export type BillingEventType =
  | 'customer.subscription.updated'
  | 'customer.subscription.deleted'
  | 'invoice.payment_succeeded'
  | 'invoice.payment_failed'

// Only the three event types a simulated webhook can actually deliver.
// customer.subscription.updated is handled separately by the plan-switch
// route, which changes planId (not status) and already logs its own event.
type SimulatableEventType = Exclude<BillingEventType, 'customer.subscription.updated'>

/**
 * Shared by both entry points: the real (secret-protected) webhook route
 * and the authenticated "simulate" route the UI buttons call. Updates
 * subscription status and logs the event together, the way a real
 * webhook handler would.
 */
export async function applyBillingEvent(orgId: string, type: SimulatableEventType) {
  const [subscription] = await db.select().from(subscriptions).where(eq(subscriptions.orgId, orgId))
  if (!subscription) {
    throw new ApiError(404, 'No subscription found for this organization')
  }

  // A canceled subscription has no active billing cycle, so it can't
  // generate a new invoice (paid or failed) or be canceled again — the
  // only way back is resubscribing via changePlan, not a payment event.
  if (subscription.status === 'canceled') {
    throw new ApiError(
      409,
      'This subscription is canceled — choose a plan to resubscribe instead of simulating a payment event',
    )
  }

  let payload: Record<string, unknown> = {}

  if (type === 'invoice.payment_succeeded') {
    const [plan] = await db.select().from(plans).where(eq(plans.id, subscription.planId))
    payload = { planId: subscription.planId, planName: plan?.name }
    await db
      .update(subscriptions)
      .set({ status: 'active', updatedAt: new Date() })
      .where(eq(subscriptions.orgId, orgId))
  } else if (type === 'invoice.payment_failed') {
    await db
      .update(subscriptions)
      .set({ status: 'past_due', updatedAt: new Date() })
      .where(eq(subscriptions.orgId, orgId))
  } else if (type === 'customer.subscription.deleted') {
    await db
      .update(subscriptions)
      .set({ status: 'canceled', updatedAt: new Date() })
      .where(eq(subscriptions.orgId, orgId))
  }

  const [event] = await db.insert(billingEvents).values({ orgId, type, payload }).returning()
  return event
}

export function summarizeBillingEvent(type: string, payload: unknown): string {
  const p = (payload ?? {}) as { planId?: string; planName?: string }
  switch (type) {
    case 'customer.subscription.updated':
      return `Switched to the ${p.planName ?? p.planId ?? 'selected'} plan`
    case 'invoice.payment_succeeded':
      return `Payment succeeded for the ${p.planName ?? p.planId ?? 'current'} plan`
    case 'invoice.payment_failed':
      return 'Payment failed — subscription is now past due'
    case 'customer.subscription.deleted':
      return 'Subscription canceled'
    default:
      return type
  }
}
