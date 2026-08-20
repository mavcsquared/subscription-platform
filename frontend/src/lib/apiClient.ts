const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://localhost:3001'

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

// In-memory only — deliberately not localStorage, so an XSS bug can't
// read it. Doesn't survive a page refresh; refreshAccessToken() (backed
// by the httpOnly refresh cookie) is how a session survives one.
let accessToken: string | null = null

export function setAccessToken(token: string | null) {
  accessToken = token
}

function buildHeaders(options: RequestInit): Headers {
  const headers = new Headers(options.headers)
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`)
  }
  return headers
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new ApiError(response.status, body?.error?.message ?? 'Something went wrong')
  }
  if (response.status === 204) {
    return undefined as T
  }
  return (await response.json()) as T
}

// Uses plain fetch, not apiFetch — this must never trigger apiFetch's
// own 401-retry logic below, or a failed refresh could recurse.
export async function refreshAccessToken(): Promise<boolean> {
  const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
  })
  if (!response.ok) {
    setAccessToken(null)
    return false
  }
  const data = (await response.json()) as { accessToken: string }
  setAccessToken(data.accessToken)
  return true
}

/**
 * Fetch wrapper every API call goes through. Attaches the in-memory
 * access token, and on a 401 (expired access token) transparently
 * refreshes once via the httpOnly cookie and retries — callers don't
 * need to know tokens exist at all.
 */
export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const request = () =>
    fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: buildHeaders(options),
      credentials: 'include',
    })

  const response = await request()

  if (response.status === 401) {
    const refreshed = await refreshAccessToken()
    if (refreshed) {
      return parseResponse<T>(await request())
    }
  }

  return parseResponse<T>(response)
}
