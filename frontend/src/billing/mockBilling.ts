import type { PlanId, Subscription } from './types'

/**
 * Per-org subscription state, mocked the same way as mockAuth's user
 * store: persisted to localStorage so it survives refreshes. Deliberately
 * has no dependency on mockAuth — a real backend would have auth and
 * billing as separate services/tables too, and an org created via signup
 * has no subscription row until one is lazily created here.
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

export async function mockChangePlan(orgId: string, planId: PlanId): Promise<Subscription> {
  await delay()
  const store = loadStore()
  const updated: Subscription = {
    orgId,
    planId,
    status: 'active',
    currentPeriodEnd: store[orgId]?.currentPeriodEnd ?? oneMonthFromNow(),
  }
  store[orgId] = updated
  saveStore(store)
  return updated
}
