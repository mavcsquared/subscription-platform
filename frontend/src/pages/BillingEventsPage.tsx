import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { isOwnerOrAdmin } from '../auth/permissions'
import {
  fetchBillingEvents,
  fetchSubscription,
  simulateBillingEvent,
  type SimulatableBillingEventType,
} from '../billing/api'
import type { BillingEvent, BillingEventType, Subscription } from '../billing/types'
import { AppHeader } from '../components/AppHeader'

const eventStyles: Record<BillingEventType, string> = {
  'customer.subscription.updated': 'bg-indigo-50 text-indigo-600',
  'customer.subscription.deleted': 'bg-red-50 text-red-600',
  'invoice.payment_succeeded': 'bg-emerald-50 text-emerald-600',
  'invoice.payment_failed': 'bg-amber-50 text-amber-600',
}

const statusStyles: Record<Subscription['status'], string> = {
  active: 'bg-emerald-50 text-emerald-600',
  past_due: 'bg-amber-50 text-amber-600',
  canceled: 'bg-red-50 text-red-600',
}

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

export function BillingEventsPage() {
  const { user } = useAuth()
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [events, setEvents] = useState<BillingEvent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSimulating, setIsSimulating] = useState(false)
  const [simulateError, setSimulateError] = useState<string | null>(null)

  const canManageBilling = user ? isOwnerOrAdmin(user.role) : false

  const refresh = useCallback(async () => {
    if (!user) return
    const [sub, fetchedEvents] = await Promise.all([fetchSubscription(), fetchBillingEvents()])
    setSubscription(sub)
    setEvents(fetchedEvents)
    setIsLoading(false)
  }, [user])

  useEffect(() => {
    refresh()
  }, [refresh])

  async function handleSimulate(event: SimulatableBillingEventType) {
    setIsSimulating(true)
    setSimulateError(null)
    try {
      await simulateBillingEvent(event)
      await refresh()
    } catch (err) {
      setSimulateError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setIsSimulating(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader />

      <main className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="text-lg font-semibold text-slate-900">Billing</h1>
        <p className="mt-1 text-sm text-slate-500">
          Subscription status and the events that changed it, standing in for a real payment
          provider's webhooks.
        </p>

        {subscription && (
          <span
            className={`mt-3 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${statusStyles[subscription.status]}`}
          >
            {subscription.status === 'active' && 'Active'}
            {subscription.status === 'past_due' && 'Past due'}
            {subscription.status === 'canceled' && 'Canceled'}
          </span>
        )}

        {!canManageBilling && (
          <p className="mt-3 text-sm text-amber-600">
            Only owners and admins can manage billing — you can view the event history as a
            member.
          </p>
        )}

        {canManageBilling && (
          <div className="mt-4 flex flex-wrap gap-3 rounded-lg border border-slate-200 bg-white p-4">
            <button
              onClick={() => handleSimulate('invoice.payment_succeeded')}
              disabled={isSimulating}
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              Simulate successful payment
            </button>
            <button
              onClick={() => handleSimulate('invoice.payment_failed')}
              disabled={isSimulating || subscription?.status === 'canceled'}
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              Simulate failed payment
            </button>
            <button
              onClick={() => handleSimulate('customer.subscription.deleted')}
              disabled={isSimulating || subscription?.status === 'canceled'}
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              Simulate subscription canceled
            </button>
          </div>
        )}
        {simulateError && <p className="mt-3 text-sm text-red-600">{simulateError}</p>}

        <div className="mt-6 overflow-hidden rounded-lg border border-slate-200 bg-white">
          {isLoading ? (
            <p className="p-6 text-sm text-slate-400">Loading events…</p>
          ) : events.length === 0 ? (
            <p className="p-6 text-sm text-slate-400">No billing events yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {events.map((event) => (
                <li key={event.id} className="flex items-center justify-between gap-4 px-4 py-3">
                  <div>
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${eventStyles[event.type]}`}
                    >
                      {event.type}
                    </span>
                    <p className="mt-1 text-sm text-slate-700">{event.summary}</p>
                  </div>
                  <span className="shrink-0 text-xs text-slate-400">
                    {formatTimestamp(event.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  )
}
