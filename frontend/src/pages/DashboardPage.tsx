import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { fetchPlans, fetchSubscription, fetchUsage, recordUsage } from '../billing/api'
import type { Plan, Subscription } from '../billing/types'
import { AppHeader } from '../components/AppHeader'
import { UsageMeter } from '../components/UsageMeter'

const SIMULATED_REQUESTS_PER_CLICK = 25

export function DashboardPage() {
  const { user } = useAuth()
  const [plan, setPlan] = useState<Plan | null>(null)
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [usage, setUsage] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSimulating, setIsSimulating] = useState(false)
  const [simulateError, setSimulateError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    Promise.all([fetchPlans(), fetchSubscription()]).then(([plans, fetchedSubscription]) => {
      const currentPlan = plans.find((p) => p.id === fetchedSubscription.planId) ?? plans[0]
      setPlan(currentPlan)
      setSubscription(fetchedSubscription)
      fetchUsage().then((count) => {
        setUsage(count)
        setIsLoading(false)
      })
    })
  }, [user])

  async function handleSimulateUsage() {
    setIsSimulating(true)
    setSimulateError(null)
    try {
      const updated = await recordUsage(SIMULATED_REQUESTS_PER_CLICK)
      setUsage(updated)
    } catch (err) {
      setSimulateError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setIsSimulating(false)
    }
  }

  const isCanceled = subscription?.status === 'canceled'

  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader />

      <main className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="text-lg font-semibold text-slate-900">Welcome, {user?.name}</h1>
        <p className="mt-1 text-sm text-slate-500">
          Signed in as {user?.email} · role: {user?.role}
        </p>

        {isLoading || !plan || usage === null ? (
          <p className="mt-8 text-sm text-slate-400">Loading usage…</p>
        ) : (
          <div className="mt-6 space-y-3">
            <UsageMeter label={`API requests this period (${plan.name} plan)`} used={usage} limit={plan.usageLimit} />
            <button
              onClick={handleSimulateUsage}
              disabled={isSimulating || isCanceled}
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              {isSimulating ? 'Recording…' : `Simulate ${SIMULATED_REQUESTS_PER_CLICK} API requests`}
            </button>
            {isCanceled && (
              <p className="text-sm text-amber-600">
                This subscription is canceled, so it can't record new usage —{' '}
                <Link to="/plans" className="font-medium underline">
                  choose a plan
                </Link>{' '}
                to resubscribe.
              </p>
            )}
            {simulateError && <p className="text-sm text-red-600">{simulateError}</p>}
          </div>
        )}
      </main>
    </div>
  )
}
