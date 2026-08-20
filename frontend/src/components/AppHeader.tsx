import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

function navLinkClass({ isActive }: { isActive: boolean }) {
  return `text-sm font-medium ${isActive ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`
}

export function AppHeader() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
        <div className="flex items-center gap-6">
          <span className="text-sm font-semibold text-slate-900">{user?.orgName}</span>
          <nav className="flex gap-4">
            <NavLink to="/dashboard" className={navLinkClass}>
              Dashboard
            </NavLink>
            <NavLink to="/plans" className={navLinkClass}>
              Plans
            </NavLink>
          </nav>
        </div>
        <button
          onClick={handleLogout}
          className="text-sm font-medium text-slate-500 hover:text-slate-700"
        >
          Log out
        </button>
      </div>
    </header>
  )
}
