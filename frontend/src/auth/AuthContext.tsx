import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { mockGetUserById, mockLogin, mockSignup } from './mockAuth'
import type { User } from './types'

const SESSION_KEY = 'sp_session'

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

  // Restore session on load, mirroring how a real app would validate a
  // stored JWT against the backend before treating the user as logged in.
  useEffect(() => {
    const sessionUserId = localStorage.getItem(SESSION_KEY)
    if (!sessionUserId) {
      setIsInitializing(false)
      return
    }
    mockGetUserById(sessionUserId).then((found) => {
      setUser(found)
      if (!found) localStorage.removeItem(SESSION_KEY)
      setIsInitializing(false)
    })
  }, [])

  async function login(email: string, password: string) {
    const loggedInUser = await mockLogin(email, password)
    localStorage.setItem(SESSION_KEY, loggedInUser.id)
    setUser(loggedInUser)
  }

  async function signup(orgName: string, name: string, email: string, password: string) {
    const newUser = await mockSignup(orgName, name, email, password)
    localStorage.setItem(SESSION_KEY, newUser.id)
    setUser(newUser)
  }

  function logout() {
    localStorage.removeItem(SESSION_KEY)
    setUser(null)
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
