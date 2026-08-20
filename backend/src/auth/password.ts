import argon2 from 'argon2'

// Argon2id, not bcrypt: it's OWASP's current first recommendation for
// password storage (memory-hard, tunable, resists GPU-based cracking
// better than bcrypt). Defaults are argon2's own, which already follow
// the OWASP-recommended baseline.
export function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, { type: argon2.argon2id })
}

export function verifyPassword(hash: string, password: string): Promise<boolean> {
  return argon2.verify(hash, password)
}
