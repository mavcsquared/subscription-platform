import { db } from './index.js'
import { plans } from './schema.js'

// Mirrors billing/mockPlans.ts in the frontend, so plan ids/limits line
// up once the real Plans page is wired to this data.
const PLAN_CATALOG = [
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

async function seed() {
  for (const plan of PLAN_CATALOG) {
    await db
      .insert(plans)
      .values(plan)
      .onConflictDoUpdate({ target: plans.id, set: plan })
  }
  console.log(`Seeded ${PLAN_CATALOG.length} plans.`)
  process.exit(0)
}

seed().catch((err) => {
  console.error(err)
  process.exit(1)
})
