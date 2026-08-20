import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { apiFetch, refreshAccessToken, setAccessToken } from '../lib/apiClient'
import type { User } from './types'

interface AuthContextValue {
  user: User | null
  isInitializing: boolean
  login: (email: string, password: string) => Promise<void>
  signup: (orgName: string, name: string, email: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isInitializing, setIsInitializing] = useState(true)

  // The access token lives only in memory, so it never survives a page
  // refresh. On load, try the httpOnly refresh cookie first; if that
  // succeeds, fetch the full profile. If not, the user is just logged
  // out — same outward behavior as the old localStorage-based restore.
  useEffect(() => {
    async function restoreSession() {
      const refreshed = await refreshAccessToken()
      if (!refreshed) {
        setIsInitializing(false)
        return
      }
      try {
        const { user: restoredUser } = await apiFetch<{ user: User }>('/auth/me')
        setUser(restoredUser)
      } catch {
        setAccessToken(null)
      } finally {
        setIsInitializing(false)
      }
    }
    restoreSession()
  }, [])

  async function login(email: string, password: string) {
    const { accessToken, user: loggedInUser } = await apiFetch<{ accessToken: string; user: User }>(
      '/auth/login',
      { method: 'POST', body: JSON.stringify({ email, password }) },
    )
    setAccessToken(accessToken)
    setUser(loggedInUser)
  }

  async function signup(orgName: string, name: string, email: string, password: string) {
    const { accessToken, user: newUser } = await apiFetch<{ accessToken: string; user: User }>(
      '/auth/signup',
      { method: 'POST', body: JSON.stringify({ orgName, name, email, password }) },
    )
    setAccessToken(accessToken)
    setUser(newUser)
  }

  function logout() {
    setAccessToken(null)
    setUser(null)
    // Best-effort session revocation — local state is already cleared,
    // so the user is "logged out" immediately regardless of this call.
    apiFetch('/auth/logout', { method: 'POST' }).catch(() => {})
  }

  return (
    <AuthContext.Provider value={{ user, isInitializing, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
