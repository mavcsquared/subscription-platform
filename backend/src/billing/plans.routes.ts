import { Router } from 'express'
import { requireAuth } from '../auth/middleware.js'
import { db } from '../db/index.js'
import { plans } from '../db/schema.js'

export const plansRouter = Router()

plansRouter.use(requireAuth)

plansRouter.get('/', async (_req, res) => {
  const allPlans = await db.select().from(plans)
  res.json({ plans: allPlans })
})
