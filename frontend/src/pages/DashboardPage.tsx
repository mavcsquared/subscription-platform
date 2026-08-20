import { useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { mockFetchSubscription } from '../billing/mockBilling'
import { getPlanById, mockFetchPlans } from '../billing/mockPlans'
import { mockFetchUsage, mockRecordUsage } from '../billing/mockUsage'
import type { Plan } from '../billing/types'
import { AppHeader } from '../components/AppHeader'
import { UsageMeter } from '../components/UsageMeter'

const SIMULATED_REQUESTS_PER_CLICK = 25

export function DashboardPage() {
  const { user } = useAuth()
  const [plan, setPlan] = useState<Plan | null>(null)
  const [usage, setUsage] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSimulating, setIsSimulating] = useState(false)

  useEffect(() => {
    if (!user) return
    Promise.all([mockFetchPlans(), mockFetchSubscription(user.orgId)]).then(
      ([plans, subscription]) => {
        const currentPlan = getPlanById(subscription.planId) ?? plans[0]
        setPlan(currentPlan)
        mockFetchUsage(user.orgId, currentPlan.usageLimit).then((count) => {
          setUsage(count)
          setIsLoading(false)
        })
      },
    )
  }, [user])

  async function handleSimulateUsage() {
    if (!user) return
    setIsSimulating(true)
    const updated = await mockRecordUsage(user.orgId, SIMULATED_REQUESTS_PER_CLICK)
    setUsage(updated)
    setIsSimulating(false)
  }

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
              disabled={isSimulating}
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              {isSimulating ? 'Recording…' : `Simulate ${SIMULATED_REQUESTS_PER_CLICK} API requests`}
            </button>
          </div>
        )}
      </main>
    </div>
  )
}
