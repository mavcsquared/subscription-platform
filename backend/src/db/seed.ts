import { eq } from 'drizzle-orm'
import { hashPassword } from '../auth/password.js'
import { oneMonthFromNow } from '../lib/dates.js'
import { db } from './index.js'
import { orgs, plans, subscriptions, users } from './schema.js'

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

// Matches the demo account the mocked frontend used to seed into
// localStorage, so LoginPage's pre-filled credentials keep working once
// wired to the real backend.
const DEMO_ACCOUNT = {
  orgName: 'Acme Inc',
  name: 'Ana Owner',
  email: 'owner@acme.test',
  password: 'password123',
}

async function seedDemoAccount() {
  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, DEMO_ACCOUNT.email))
  if (existing) {
    console.log('Demo account already exists, skipping.')
    return
  }

  const passwordHash = await hashPassword(DEMO_ACCOUNT.password)
  await db.transaction(async (tx) => {
    const [org] = await tx.insert(orgs).values({ name: DEMO_ACCOUNT.orgName }).returning()
    await tx.insert(users).values({
      orgId: org.id,
      name: DEMO_ACCOUNT.name,
      email: DEMO_ACCOUNT.email,
      passwordHash,
      role: 'owner',
      status: 'active',
    })
    await tx.insert(subscriptions).values({
      orgId: org.id,
      planId: 'starter',
      status: 'active',
      currentPeriodEnd: oneMonthFromNow(),
    })
  })
  console.log(`Seeded demo account: ${DEMO_ACCOUNT.email} / ${DEMO_ACCOUNT.password}`)
}

async function seed() {
  for (const plan of PLAN_CATALOG) {
    await db
      .insert(plans)
      .values(plan)
      .onConflictDoUpdate({ target: plans.id, set: plan })
  }
  console.log(`Seeded ${PLAN_CATALOG.length} plans.`)

  await seedDemoAccount()

  process.exit(0)
}

seed().catch((err) => {
  console.error(err)
  process.exit(1)
})
