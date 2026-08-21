# Subscription Platform

A multi-tenant subscription/billing platform, modeled loosely on real
subscription-commerce businesses. Organizations (accounts) have multiple
users with distinct roles, subscribe to tiered plans with usage limits,
get metered against those limits, and have their subscription state
updated by simulated payment-provider webhook events.

## Live demo

**https://frontend-two-olive-53.vercel.app**

Log in with the seeded demo account: `owner@acme.test` / `password123`
(public — anyone can log in and modify that org's data, so don't put
anything sensitive there).

The backend runs on Render's free tier, which spins down after ~15
minutes of inactivity. The first request after a period of no traffic
can take 30–60s to respond while it cold-starts — if you're sharing
this link live, hitting it a minute beforehand avoids the wait.

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
shape before the backend existed. The backend and Postgres schema now
exist, and every feature has been wired to it — the app runs end to end
on real data:

- Auth — signup, login, session refresh/logout, Argon2 password
  hashing, JWT access + refresh tokens
- Team/member management, with server-side role enforcement (not just
  hidden UI) verified independently of the frontend
- Plans/pricing and plan switching
- Usage metering, as an append-only event log rather than a mutable
  counter
- Billing events, including a real webhook endpoint
  (`POST /webhooks/billing`, shared-secret protected, no user session)
  separate from the authenticated UI that simulates a payment
  provider's events hitting it

## Structure

```
frontend/   React + TypeScript app
backend/    Node.js + TypeScript API (Express + Drizzle + PostgreSQL)
```

## Deployment

Frontend on Vercel, backend on Render (free web service), database on
Neon (free Postgres) — all free tier. `render.yaml` at the repo root
declares the backend service as a Blueprint; `frontend/vercel.json` adds
the SPA rewrite React Router needs. Neither platform's free tier
auto-deploys from the other's changes by itself: Render redeploys
automatically on push to `main` (Blueprint services track a branch),
but the frontend was linked via the Vercel CLI rather than its GitHub
integration, so a new frontend change needs an explicit
`vercel deploy --prod` from `frontend/` to go live.

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
