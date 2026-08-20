import crypto from 'node:crypto'
import jwt from 'jsonwebtoken'
import { config } from '../config.js'
import type { Role } from '../db/schema.js'

const ACCESS_TOKEN_TTL = '15m'
export const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000 // 30 days

export interface AccessTokenClaims {
  sub: string // user id
  orgId: string
  role: Role
}

export function signAccessToken(claims: AccessTokenClaims): string {
  return jwt.sign(claims, config.jwtSecret, { expiresIn: ACCESS_TOKEN_TTL })
}

export function verifyAccessToken(token: string): AccessTokenClaims {
  const payload = jwt.verify(token, config.jwtSecret)
  if (typeof payload === 'string') {
    throw new Error('Unexpected access token payload')
  }
  return payload as AccessTokenClaims
}

// Refresh tokens are opaque random strings, not JWTs: their validity is
// looked up in the sessions table anyway (that's what makes them
// revocable), so encoding claims into them would be redundant.
export function generateRefreshToken(): string {
  return crypto.randomBytes(64).toString('hex')
}

// High-entropy already, so a fast hash (not argon2/bcrypt, which are for
// low-entropy human passwords) is appropriate here — this only protects
// against a raw DB leak handing out usable tokens.
export function hashRefreshToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}
