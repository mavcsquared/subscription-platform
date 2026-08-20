import type { Plan } from './types'

/**
 * Static plan catalog. Plans/Usage are wired to the real backend now
 * (see billing/api.ts) — this file's only remaining consumer is
 * mockBilling.ts's still-mocked webhook simulator, which needs a plan
 * name to build event summaries. Its data is a frozen snapshot, not
 * read from the real `plans` table, since the whole billing-events
 * simulator is still a self-contained mock bubble until that gets
 * wired up too.
 */
const PLANS: Plan[] = [
  {
    id: 'starter',
    name: 'Starter',
    priceMonthlyCents: 0,
    seatLimit: 3,
    usageLimit: 1_000,
    features: ['Up to 3 team members', '1,000 API requests / month', 'Community support'],
  },
  {
    id: 'pro',
    name: 'Pro',
    priceMonthlyCents: 4900,
    seatLimit: 10,
    usageLimit: 50_000,
    features: [
      'Up to 10 team members',
      '50,000 API requests / month',
      'Priority email support',
      'Usage alerts',
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    priceMonthlyCents: 19900,
    seatLimit: null,
    usageLimit: 500_000,
    features: [
      'Unlimited team members',
      '500,000 API requests / month',
      'Dedicated support',
      'SSO (coming soon)',
    ],
  },
]

export function getPlanById(id: string): Plan | undefined {
  return PLANS.find((p) => p.id === id)
}
