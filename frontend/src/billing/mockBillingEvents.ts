import type { BillingEvent, BillingEventType } from './types'

/**
 * Append-only event log, standing in for the events a real Stripe-shaped
 * webhook handler would persist as it processes incoming events. Other
 * billing mock modules call recordBillingEvent whenever they change
 * subscription state, the same way the real webhook handler will update
 * the subscription row and log the event in one place.
 */

const STORE_KEY = 'sp_mock_billing_events'

function loadStore(): BillingEvent[] {
  const raw = localStorage.getItem(STORE_KEY)
  return raw ? (JSON.parse(raw) as BillingEvent[]) : []
}

function saveStore(events: BillingEvent[]) {
  localStorage.setItem(STORE_KEY, JSON.stringify(events))
}

function delay(ms = 250) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function recordBillingEvent(orgId: string, type: BillingEventType, summary: string): BillingEvent {
  const event: BillingEvent = {
    id: crypto.randomUUID(),
    orgId,
    type,
    createdAt: new Date().toISOString(),
    summary,
  }
  const events = loadStore()
  events.push(event)
  saveStore(events)
  return event
}

export async function mockListBillingEvents(orgId: string): Promise<BillingEvent[]> {
  await delay()
  return loadStore()
    .filter((e) => e.orgId === orgId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}
