import type { NextFunction, Request, Response } from 'express'
import type { Role } from '../db/schema.js'
import { ApiError } from '../errors.js'
import { verifyAccessToken } from './tokens.js'

declare global {
  namespace Express {
    interface Request {
      // Claims from the access token only — not a full DB user record.
      // Route handlers that need fresh profile data (email, org name,
      // etc.) still query the database explicitly.
      auth?: { sub: string; orgId: string; role: Role }
    }
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    throw new ApiError(401, 'Missing or invalid Authorization header')
  }

  try {
    const claims = verifyAccessToken(header.slice('Bearer '.length))
    req.auth = { sub: claims.sub, orgId: claims.orgId, role: claims.role }
    next()
  } catch {
    throw new ApiError(401, 'Invalid or expired access token')
  }
}

// Reads the role from the access token rather than re-querying the
// database on every request — the trade-off is that a role change takes
// effect for an already-issued token only once it expires (at most 15
// minutes), not instantly.
export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.auth || !roles.includes(req.auth.role)) {
      throw new ApiError(403, 'You do not have permission to perform this action')
    }
    next()
  }
}
