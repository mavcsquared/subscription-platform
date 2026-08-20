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
- **Auth** — password hashing, session/JWT with expiry, server-side role
  checks (not just hidden UI).

## Stack

- **Frontend:** React + TypeScript (Vite), Tailwind CSS, React Router
- **Backend:** Node.js + TypeScript (planned)
- **Database:** PostgreSQL (planned)

## Status

The frontend is being built first against mocked data so the UI can take
shape before the backend exists. Currently implemented:

- Login/signup with a mocked auth layer
- Plans/pricing page with mocked billing data
- Usage-metering widget on the dashboard

The backend (Postgres schema, API, real auth) hasn't been built yet —
the frontend mocks will be replaced with real API calls incrementally.

## Structure

```
frontend/   React + TypeScript app
backend/    Node.js + TypeScript API (coming soon)
```

## Running locally

```
cd frontend
npm install
npm run dev
```
