import { relations } from 'drizzle-orm'
import { index, integer, jsonb, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

export const roleEnum = pgEnum('role', ['owner', 'admin', 'member'])
export const memberStatusEnum = pgEnum('member_status', ['active', 'invited'])
export const subscriptionStatusEnum = pgEnum('subscription_status', ['active', 'past_due', 'canceled'])

export type Role = (typeof roleEnum.enumValues)[number]

export const orgs = pgTable('orgs', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => orgs.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    email: text('email').notNull().unique(),
    // Null until an invited member accepts and sets their own password.
    passwordHash: text('password_hash'),
    role: roleEnum('role').notNull().default('member'),
    status: memberStatusEnum('status').notNull().default('active'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('users_org_id_idx').on(table.orgId)],
)

// Small fixed catalog, seeded rather than created by the app at runtime.
export const plans = pgTable('plans', {
  id: text('id').primaryKey(), // 'starter' | 'pro' | 'enterprise'
  name: text('name').notNull(),
  priceMonthlyCents: integer('price_monthly_cents').notNull(),
  seatLimit: integer('seat_limit'), // null = unlimited
  usageLimit: integer('usage_limit').notNull(),
  features: text('features').array().notNull(),
})

// One-to-one with orgs, so org_id is the primary key rather than a
// separate surrogate id.
export const subscriptions = pgTable('subscriptions', {
  orgId: uuid('org_id')
    .primaryKey()
    .references(() => orgs.id, { onDelete: 'cascade' }),
  planId: text('plan_id')
    .notNull()
    .references(() => plans.id),
  status: subscriptionStatusEnum('status').notNull().default('active'),
  currentPeriodEnd: timestamp('current_period_end', { withTimezone: true }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

// Append-only usage records rather than a mutable counter, so usage is
// auditable and reconcilable instead of a single value that can drift.
// Current-period usage is SUM(quantity) WHERE occurred_at >= period_start.
export const usageEvents = pgTable(
  'usage_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => orgs.id, { onDelete: 'cascade' }),
    quantity: integer('quantity').notNull(),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('usage_events_org_id_occurred_at_idx').on(table.orgId, table.occurredAt)],
)

// Append-only log of Stripe-shaped webhook events, storing the raw
// payload a real provider would send. Human-readable summaries are a
// presentation concern derived at the API layer, not stored here.
export const billingEvents = pgTable(
  'billing_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => orgs.id, { onDelete: 'cascade' }),
    type: text('type').notNull(),
    payload: jsonb('payload').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('billing_events_org_id_created_at_idx').on(table.orgId, table.createdAt)],
)

// Backs refresh tokens: the token itself is a random opaque string the
// client only ever sees in an httpOnly cookie. Only its SHA-256 hash is
// stored, so a DB leak doesn't hand out usable tokens. Deleting a row
// revokes that session immediately; access tokens (short-lived JWTs)
// aren't stored anywhere and simply expire on their own.
export const sessions = pgTable(
  'sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull().unique(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('sessions_user_id_idx').on(table.userId)],
)

export const orgsRelations = relations(orgs, ({ many, one }) => ({
  users: many(users),
  subscription: one(subscriptions, {
    fields: [orgs.id],
    references: [subscriptions.orgId],
  }),
  usageEvents: many(usageEvents),
  billingEvents: many(billingEvents),
}))

export const usersRelations = relations(users, ({ one, many }) => ({
  org: one(orgs, { fields: [users.orgId], references: [orgs.id] }),
  sessions: many(sessions),
}))

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}))

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  org: one(orgs, { fields: [subscriptions.orgId], references: [orgs.id] }),
  plan: one(plans, { fields: [subscriptions.planId], references: [plans.id] }),
}))
