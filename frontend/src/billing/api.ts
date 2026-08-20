import { apiFetch } from '../lib/apiClient'
import type { BillingEvent, BillingEventType, Plan, PlanId, Subscription } from './types'

// Excludes customer.subscription.updated — that event is only ever
// produced by changePlan() above, matching the backend's restriction.
export type SimulatableBillingEventType = Exclude<BillingEventType, 'customer.subscription.updated'>

// No orgId parameter anywhere here — the backend derives it from the
// caller's access token, same pattern as team/api.ts.

export function fetchPlans(): Promise<Plan[]> {
  return apiFetch<{ plans: Plan[] }>('/plans').then((r) => r.plans)
}

export function fetchSubscription(): Promise<Subscription> {
  return apiFetch<{ subscription: Subscription }>('/billing/subscription').then((r) => r.subscription)
}

export function changePlan(planId: PlanId): Promise<Subscription> {
  return apiFetch<{ subscription: Subscription }>('/billing/subscription', {
    method: 'POST',
    body: JSON.stringify({ planId }),
  }).then((r) => r.subscription)
}

export function fetchUsage(): Promise<number> {
  return apiFetch<{ used: number }>('/usage').then((r) => r.used)
}

export function recordUsage(quantity: number): Promise<number> {
  return apiFetch<{ used: number }>('/usage', {
    method: 'POST',
    body: JSON.stringify({ quantity }),
  }).then((r) => r.used)
}

export function fetchBillingEvents(): Promise<BillingEvent[]> {
  return apiFetch<{ events: BillingEvent[] }>('/billing/events').then((r) => r.events)
}

export function simulateBillingEvent(event: SimulatableBillingEventType): Promise<void> {
  return apiFetch<void>('/billing/simulate', {
    method: 'POST',
    body: JSON.stringify({ event }),
  })
}
