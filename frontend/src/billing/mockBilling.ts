import { recordBillingEvent } from './mockBillingEvents'
import { getPlanById } from './mockPlans'
import type { Subscription } from './types'

/**
 * Per-org subscription state, persisted to localStorage. Plans/Usage are
 * wired to the real backend now (see billing/api.ts) — mockChangePlan is
 * gone since PlansPage no longer uses it. What's left (mockFetchSubscription
 * plus the mockSimulate* functions) still backs BillingEventsPage's
 * webhook simulator, which remains its own self-contained mock bubble,
 * entirely disconnected from the real subscription these other pages now
 * read/write. That gets resolved when billing events get wired up too.
 *
 * Every function that changes subscription state also calls
 * recordBillingEvent, standing in for what a real Stripe webhook handler
 * does: update the subscription row and log the event together.
 */

const STORE_KEY = 'sp_mock_subscriptions'

function loadStore(): Record<string, Subscription> {
  const raw = localStorage.getItem(STORE_KEY)
  return raw ? (JSON.parse(raw) as Record<string, Subscription>) : {}
}

function saveStore(store: Record<string, Subscription>) {
  localStorage.setItem(STORE_KEY, JSON.stringify(store))
}

function delay(ms = 300) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function oneMonthFromNow(): string {
  const d = new Date()
  d.setMonth(d.getMonth() + 1)
  return d.toISOString()
}

export async function mockFetchSubscription(orgId: string): Promise<Subscription> {
  await delay()
  const store = loadStore()
  if (!store[orgId]) {
    store[orgId] = {
      orgId,
      planId: 'starter',
      status: 'active',
      currentPeriodEnd: oneMonthFromNow(),
    }
    saveStore(store)
  }
  return store[orgId]
}

export async function mockSimulateInvoicePaid(orgId: string): Promise<Subscription> {
  await delay()
  const store = loadStore()
  const existing = store[orgId]
  const updated: Subscription = {
    orgId,
    planId: existing?.planId ?? 'starter',
    status: 'active',
    currentPeriodEnd: existing?.currentPeriodEnd ?? oneMonthFromNow(),
  }
  store[orgId] = updated
  saveStore(store)
  recordBillingEvent(
    orgId,
    'invoice.payment_succeeded',
    `Payment succeeded for the ${getPlanById(updated.planId)?.name ?? updated.planId} plan`,
  )
  return updated
}

export async function mockSimulateInvoiceFailed(orgId: string): Promise<Subscription> {
  await delay()
  const store = loadStore()
  const existing = store[orgId]
  const updated: Subscription = {
    orgId,
    planId: existing?.planId ?? 'starter',
    status: 'past_due',
    currentPeriodEnd: existing?.currentPeriodEnd ?? oneMonthFromNow(),
  }
  store[orgId] = updated
  saveStore(store)
  recordBillingEvent(orgId, 'invoice.payment_failed', 'Payment failed — subscription is now past due')
  return updated
}

export async function mockSimulateSubscriptionCanceled(orgId: string): Promise<Subscription> {
  await delay()
  const store = loadStore()
  const existing = store[orgId]
  const updated: Subscription = {
    orgId,
    planId: existing?.planId ?? 'starter',
    status: 'canceled',
    currentPeriodEnd: existing?.currentPeriodEnd ?? oneMonthFromNow(),
  }
  store[orgId] = updated
  saveStore(store)
  recordBillingEvent(orgId, 'customer.subscription.deleted', 'Subscription canceled')
  return updated
}
