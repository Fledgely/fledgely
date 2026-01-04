/**
 * Stripe Webhook Handler
 * Epic 50: SaaS Subscription Management
 * Story 50.3: Stripe payment integration
 *
 * Handles Stripe webhook events for subscription lifecycle management.
 */

import { onRequest } from 'firebase-functions/v2/https'
import * as logger from 'firebase-functions/logger'
import * as subscriptionService from '../services/subscriptionService'

/**
 * Stripe webhook endpoint for subscription events.
 *
 * Verifies the webhook signature and processes subscription lifecycle events.
 */
export const stripeWebhook = onRequest(
  {
    memory: '256MiB',
    timeoutSeconds: 60,
    // Raw body needed for signature verification
    invoker: 'public',
  },
  async (request, response) => {
    // Only accept POST requests
    if (request.method !== 'POST') {
      response.status(405).send('Method Not Allowed')
      return
    }

    // Check if Stripe is configured
    if (!subscriptionService.isStripeConfigured()) {
      logger.warn('Stripe webhook received but Stripe is not configured')
      response.status(503).send('Payment system not configured')
      return
    }

    // Get the signature header
    const signature = request.headers['stripe-signature']
    if (!signature || typeof signature !== 'string') {
      logger.warn('Missing Stripe signature header')
      response.status(400).send('Missing signature')
      return
    }

    try {
      // Verify and parse the webhook
      const event = subscriptionService.verifyWebhook(request.rawBody, signature)

      logger.info('Stripe webhook received', {
        type: event.type,
        id: event.id,
      })

      // Handle subscription events
      if (event.type.startsWith('customer.subscription.')) {
        await subscriptionService.handleSubscriptionEvent(event)
      } else if (event.type === 'checkout.session.completed') {
        // Handle checkout completion
        logger.info('Checkout session completed', { sessionId: event.data.object.id })
      } else if (event.type === 'invoice.payment_succeeded') {
        // Handle successful payment
        logger.info('Invoice payment succeeded', { invoiceId: event.data.object.id })
      } else if (event.type === 'invoice.payment_failed') {
        // Handle failed payment
        logger.warn('Invoice payment failed', { invoiceId: event.data.object.id })
      } else {
        logger.debug('Unhandled Stripe event', { type: event.type })
      }

      // Acknowledge receipt of the event
      response.status(200).json({ received: true })
    } catch (error) {
      logger.error('Stripe webhook error', { error })

      if (error instanceof Error && error.message.includes('signature')) {
        response.status(401).send('Invalid signature')
      } else {
        response.status(500).send('Webhook processing failed')
      }
    }
  }
)
