# Subscription Platform

A multi-tenant subscription/billing platform, modeled loosely on real
subscription-commerce businesses. Organizations (accounts) have multiple
users with distinct roles, subscribe to tiered plans with usage limits,
get metered against those limits, and have their subscription state
updated by simulated payment-provider webhook events.

## Domain

- **Accounts & roles** — organizations with users belonging to them,
  role-based access (owner/admin/member) enforced server-side.
- **Subscription plans** — tiers with pricing and feature/usage limits.
- **Usage metering** — a usage metric tracked against the org's plan limit.
- **Billing events** — a webhook endpoint that simulates a payment
  provider (Stripe-shaped events) updating subscription state.
- **Auth** — password hashing (Argon2id), short-lived JWT access tokens
  plus rotating, revocable refresh tokens, server-side role checks (not
  just hidden UI).

## Stack

- **Frontend:** React + TypeScript (Vite), Tailwind CSS, React Router
- **Backend:** Node.js + TypeScript (Express), Drizzle ORM
- **Database:** PostgreSQL

## Status

The frontend was built first against mocked data so the UI could take
shape before the backend existed; the backend and Postgres schema now
exist and are being wired in feature by feature, replacing each mock in
turn.

Real (backend-backed):
- Auth — signup, login, session refresh/logout, Argon2 password
  hashing, JWT access + refresh tokens

Still mocked on the frontend (not yet wired to the backend):
- Plans/pricing page and plan switching
- Usage-metering widget
- Team/member management
- Billing-events feed and webhook simulation

## Structure

```
frontend/   React + TypeScript app
backend/    Node.js + TypeScript API (Express + Drizzle + PostgreSQL)
```

## Running locally

Requires a local PostgreSQL instance and two `.env` files (see each
package's `.env.example`).

```
# backend
cd backend
npm install
npm run db:migrate
npm run db:seed
npm run dev

# frontend (separate terminal)
cd frontend
npm install
npm run dev
```
