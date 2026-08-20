import { useAuth } from '../auth/AuthContext'
import { AppHeader } from '../components/AppHeader'

export function DashboardPage() {
  const { user } = useAuth()

  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader />

      <main className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="text-lg font-semibold text-slate-900">Welcome, {user?.name}</h1>
        <p className="mt-1 text-sm text-slate-500">
          Signed in as {user?.email} · role: {user?.role}
        </p>

        <div className="mt-6 rounded-lg border border-dashed border-slate-300 p-8 text-center text-sm text-slate-400">
          Usage metering and billing status will show up here once the backend is wired in.
        </div>
      </main>
    </div>
  )
}
