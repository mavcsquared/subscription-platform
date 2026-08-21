import { useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { isOwnerOrAdmin } from '../auth/permissions'
import { changePlan, fetchPlans, fetchSubscription } from '../billing/api'
import type { Plan, PlanId, Subscription } from '../billing/types'
import { AppHeader } from '../components/AppHeader'

function formatPrice(cents: number): string {
  return cents === 0 ? 'Free' : `$${(cents / 100).toFixed(0)}/mo`
}

export function PlansPage() {
  const { user } = useAuth()
  const [plans, setPlans] = useState<Plan[]>([])
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [switchingTo, setSwitchingTo] = useState<PlanId | null>(null)
  const [switchError, setSwitchError] = useState<string | null>(null)

  const canManageBilling = user ? isOwnerOrAdmin(user.role) : false

  useEffect(() => {
    if (!user) return
    Promise.all([fetchPlans(), fetchSubscription()]).then(([fetchedPlans, fetchedSubscription]) => {
      setPlans(fetchedPlans)
      setSubscription(fetchedSubscription)
      setIsLoading(false)
    })
  }, [user])

  async function handleSwitch(planId: PlanId) {
    setSwitchingTo(planId)
    setSwitchError(null)
    try {
      const updated = await changePlan(planId)
      setSubscription(updated)
    } catch (err) {
      setSwitchError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSwitchingTo(null)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader />

      <main className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="text-lg font-semibold text-slate-900">Plans</h1>
        <p className="mt-1 text-sm text-slate-500">
          Choose the plan that fits {user?.orgName}. Changes take effect immediately in this demo.
        </p>
        {!canManageBilling && (
          <p className="mt-1 text-sm text-amber-600">
            Only owners and admins can change the plan — you can view it as a member.
          </p>
        )}
        {subscription?.status === 'canceled' && (
          <p className="mt-1 text-sm text-amber-600">
            Your subscription is canceled — choose a plan below to resubscribe.
          </p>
        )}
        {switchError && <p className="mt-1 text-sm text-red-600">{switchError}</p>}

        {isLoading ? (
          <p className="mt-8 text-sm text-slate-400">Loading plans…</p>
        ) : (
          <div className="mt-8 grid gap-6 sm:grid-cols-3">
            {plans.map((plan) => {
              // A canceled subscription keeps its last planId (only status
              // changes), so without the status check the previously-active
              // plan would still show as "current" and its own button would
              // stay disabled — blocking the exact resubscribe action this
              // page needs to offer.
              const isCurrent = subscription?.status !== 'canceled' && subscription?.planId === plan.id
              return (
                <div
                  key={plan.id}
                  className={`flex flex-col rounded-lg border bg-white p-6 ${
                    isCurrent ? 'border-indigo-600 ring-1 ring-indigo-600' : 'border-slate-200'
                  }`}
                >
                  {isCurrent && (
                    <span className="mb-2 inline-block w-fit rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-600">
                      Current plan
                    </span>
                  )}
                  <h2 className="text-base font-semibold text-slate-900">{plan.name}</h2>
                  <p className="mt-1 text-2xl font-bold text-slate-900">
                    {formatPrice(plan.priceMonthlyCents)}
                  </p>

                  <ul className="mt-4 flex-1 space-y-2 text-sm text-slate-600">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex gap-2">
                        <span className="text-indigo-600">✓</span>
                        {feature}
                      </li>
                    ))}
                  </ul>

                  {isCurrent ? (
                    <button
                      disabled
                      className="mt-6 cursor-default rounded-md bg-slate-100 px-3 py-2 text-sm font-medium text-slate-400"
                    >
                      Current plan
                    </button>
                  ) : canManageBilling ? (
                    <button
                      onClick={() => handleSwitch(plan.id)}
                      disabled={switchingTo !== null}
                      className="mt-6 rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-60"
                    >
                      {switchingTo === plan.id ? 'Switching…' : `Switch to ${plan.name}`}
                    </button>
                  ) : (
                    <button
                      disabled
                      className="mt-6 cursor-not-allowed rounded-md bg-slate-100 px-3 py-2 text-sm font-medium text-slate-400"
                    >
                      Owner/admin only
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
