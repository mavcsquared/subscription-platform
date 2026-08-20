import { apiFetch } from '../lib/apiClient'
import type { Plan, PlanId, Subscription } from './types'

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
