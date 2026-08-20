import type { Plan } from './types'

/**
 * Static plan catalog. In the real backend this becomes a `plans` table
 * (or a small config table) that the pricing endpoint reads from; kept
 * here as a flat array since it doesn't need to be user-editable yet.
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

function delay(ms = 300) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function mockFetchPlans(): Promise<Plan[]> {
  await delay()
  return PLANS
}

export function getPlanById(id: string): Plan | undefined {
  return PLANS.find((p) => p.id === id)
}
