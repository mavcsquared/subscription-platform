import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import { config } from './config.js'
import { healthRouter } from './routes/health.js'

// Built separately from the listening server so tests can exercise the
// app (e.g. with supertest) without binding a real port.
export function createApp() {
  const app = express()

  app.use(helmet())
  app.use(cors({ origin: config.corsOrigin }))
  app.use(express.json())

  app.use(healthRouter)

  return app
}
