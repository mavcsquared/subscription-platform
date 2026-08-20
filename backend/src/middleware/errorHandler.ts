import type { ErrorRequestHandler } from 'express'
import { ZodError } from 'zod'
import { ApiError } from '../errors.js'

// Centralizes error -> HTTP response mapping so route handlers can just
// throw. Express 5 forwards rejected promises from async handlers here
// automatically, so no per-route try/catch is needed.
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ApiError) {
    res.status(err.status).json({ error: { message: err.message } })
    return
  }

  if (err instanceof ZodError) {
    res.status(400).json({ error: { message: 'Invalid request', issues: err.issues } })
    return
  }

  console.error(err)
  res.status(500).json({ error: { message: 'Internal server error' } })
}
