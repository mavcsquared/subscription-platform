import { useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { isOwnerOrAdmin } from '../auth/permissions'
import { mockChangePlan, mockFetchSubscription } from '../billing/mockBilling'
import { mockFetchPlans } from '../billing/mockPlans'
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

  const canManageBilling = user ? isOwnerOrAdmin(user.role) : false

  useEffect(() => {
    if (!user) return
    Promise.all([mockFetchPlans(), mockFetchSubscription(user.orgId)]).then(
      ([fetchedPlans, fetchedSubscription]) => {
        setPlans(fetchedPlans)
        setSubscription(fetchedSubscription)
        setIsLoading(false)
      },
    )
  }, [user])

  async function handleSwitch(planId: PlanId) {
    if (!user) return
    setSwitchingTo(planId)
    const updated = await mockChangePlan(user.orgId, planId)
    setSubscription(updated)
    setSwitchingTo(null)
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

        {isLoading ? (
          <p className="mt-8 text-sm text-slate-400">Loading plans…</p>
        ) : (
          <div className="mt-8 grid gap-6 sm:grid-cols-3">
            {plans.map((plan) => {
              const isCurrent = subscription?.planId === plan.id
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
