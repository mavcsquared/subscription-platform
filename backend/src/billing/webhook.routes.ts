import { timingSafeEqual } from 'node:crypto'
import { Router } from 'express'
import { z } from 'zod'
import { config } from '../config.js'
import { ApiError } from '../errors.js'
import { applyBillingEvent } from './events.js'

export const webhookRouter = Router()

/**
 * Stands in for verifying a real Stripe webhook's HMAC signature
 * (computed from the raw body + a signing secret via the Stripe SDK).
 * We don't have a real Stripe integration, so this is a simpler shared
 * secret comparison — the security principle is the same one: verify
 * the caller before trusting the payload. timingSafeEqual avoids
 * leaking the secret one byte at a time via response-time differences.
 */
function isValidWebhookSecret(provided: string | undefined): boolean {
  if (!provided) return false
  const expected = Buffer.from(config.webhookSecret)
  const actual = Buffer.from(provided)
  if (expected.length !== actual.length) return false
  return timingSafeEqual(expected, actual)
}

const webhookEventSchema = z.object({
  type: z.enum(['invoice.payment_succeeded', 'invoice.payment_failed', 'customer.subscription.deleted']),
  data: z.object({
    // Stands in for a Stripe customer ID -> org lookup, which would
    // require a real Stripe integration to have something to look up.
    orgId: z.string(),
  }),
})

// No requireAuth here deliberately: a real payment provider's webhook
// isn't calling on behalf of a logged-in user, so a user JWT wouldn't
// make sense — the shared secret is this endpoint's actual authentication.
webhookRouter.post('/billing', async (req, res) => {
  if (!isValidWebhookSecret(req.header('X-Webhook-Secret'))) {
    throw new ApiError(401, 'Invalid webhook signature')
  }

  const body = webhookEventSchema.parse(req.body)
  const event = await applyBillingEvent(body.data.orgId, body.type)
  res.status(201).json({ event })
})
