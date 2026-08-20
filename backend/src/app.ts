import cookieParser from 'cookie-parser'
import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import { authRouter } from './auth/routes.js'
import { plansRouter } from './billing/plans.routes.js'
import { subscriptionRouter } from './billing/subscription.routes.js'
import { usageRouter } from './billing/usage.routes.js'
import { webhookRouter } from './billing/webhook.routes.js'
import { config } from './config.js'
import { errorHandler } from './middleware/errorHandler.js'
import { healthRouter } from './routes/health.js'
import { teamRouter } from './team/routes.js'

// Built separately from the listening server so tests can exercise the
// app (e.g. with supertest) without binding a real port.
export function createApp() {
  const app = express()

  app.use(helmet())
  // credentials: true + a specific origin (not '*') is required for the
  // refresh-token cookie to be sent cross-port in dev (5173 -> 3001).
  app.use(cors({ origin: config.corsOrigin, credentials: true }))
  app.use(express.json())
  app.use(cookieParser())

  app.use(healthRouter)
  app.use('/auth', authRouter)
  app.use('/team', teamRouter)
  app.use('/plans', plansRouter)
  app.use('/billing', subscriptionRouter)
  app.use('/usage', usageRouter)
  app.use('/webhooks', webhookRouter)

  app.use(errorHandler)

  return app
}
