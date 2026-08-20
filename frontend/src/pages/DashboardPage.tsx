import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

export function DashboardPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
          <span className="text-sm font-semibold text-slate-900">{user?.orgName}</span>
          <button
            onClick={handleLogout}
            className="text-sm font-medium text-slate-500 hover:text-slate-700"
          >
            Log out
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="text-lg font-semibold text-slate-900">Welcome, {user?.name}</h1>
        <p className="mt-1 text-sm text-slate-500">
          Signed in as {user?.email} · role: {user?.role}
        </p>

        <div className="mt-6 rounded-lg border border-dashed border-slate-300 p-8 text-center text-sm text-slate-400">
          Subscription plan, usage metering, and billing status will show up here
          once the backend is wired in.
        </div>
      </main>
    </div>
  )
}
