export type PlanId = 'starter' | 'pro' | 'enterprise'

export interface Plan {
  id: PlanId
  name: string
  priceMonthlyCents: number
  seatLimit: number | null // null = unlimited
  usageLimit: number // included API requests per month
  features: string[]
}

export type SubscriptionStatus = 'active' | 'past_due' | 'canceled'

export interface Subscription {
  orgId: string
  planId: PlanId
  status: SubscriptionStatus
  currentPeriodEnd: string // ISO date
}
