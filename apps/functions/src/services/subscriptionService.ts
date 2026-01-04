/**
 * Subscription Service
 * Epic 50: SaaS Subscription Management
 *
 * Handles subscription lifecycle, Stripe integration, and plan management.
 */

import Stripe from 'stripe'
import { getFirestore } from 'firebase-admin/firestore'
import * as logger from 'firebase-functions/logger'
import { defineString } from 'firebase-functions/params'
import {
  Subscription,
  SubscriptionPlan,
  SubscriptionStatus,
  BillingInterval,
  SUBSCRIPTION_PLANS,
  TRIAL_DURATION_DAYS,
  PlanDefinition,
} from '@fledgely/shared'

// =============================================================================
// Configuration
// =============================================================================

const STRIPE_SECRET_KEY = defineString('STRIPE_SECRET_KEY', {
  description: 'Stripe secret API key',
  default: '',
})

const STRIPE_WEBHOOK_SECRET = defineString('STRIPE_WEBHOOK_SECRET', {
  description: 'Stripe webhook signing secret',
  default: '',
})

const APP_URL = defineString('APP_URL', {
  description: 'Application URL for redirects',
  default: 'http://localhost:3000',
})

// =============================================================================
// Stripe Client
// =============================================================================

let stripeClient: Stripe | null = null

/**
 * Get configured Stripe client.
 * Throws if Stripe is not configured.
 */
function getStripe(): Stripe {
  if (!stripeClient) {
    const key = STRIPE_SECRET_KEY.value()
    if (!key) {
      throw new Error('Stripe is not configured. Set STRIPE_SECRET_KEY.')
    }
    stripeClient = new Stripe(key, {
      apiVersion: '2025-12-15.clover',
      typescript: true,
    })
  }
  return stripeClient
}

/**
 * Check if Stripe is configured.
 */
export function isStripeConfigured(): boolean {
  return !!STRIPE_SECRET_KEY.value()
}

// =============================================================================
// Subscription CRUD
// =============================================================================

const db = () => getFirestore()
const subscriptionsRef = () => db().collection('subscriptions')

/**
 * Get subscription for a family.
 */
export async function getSubscription(familyId: string): Promise<Subscription | null> {
  const doc = await subscriptionsRef().doc(familyId).get()
  if (!doc.exists) {
    return null
  }
  return doc.data() as Subscription
}

/**
 * Create or update subscription.
 */
export async function saveSubscription(subscription: Subscription): Promise<void> {
  await subscriptionsRef().doc(subscription.familyId).set(subscription, { merge: true })
}

/**
 * Create a free tier subscription for a new family.
 */
export async function createFreeSubscription(familyId: string): Promise<Subscription> {
  const now = Date.now()
  const subscription: Subscription = {
    familyId,
    plan: SubscriptionPlan.FREE,
    status: SubscriptionStatus.FREE,
    currentPeriodStart: now,
    currentPeriodEnd: now + 365 * 24 * 60 * 60 * 1000, // 1 year
    cancelAtPeriodEnd: false,
    createdAt: now,
    updatedAt: now,
  }
  await saveSubscription(subscription)
  return subscription
}

/**
 * Start a trial subscription.
 */
export async function startTrial(
  familyId: string,
  stripeCustomerId: string
): Promise<Subscription> {
  const now = Date.now()
  const trialEnd = now + TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000

  const subscription: Subscription = {
    familyId,
    plan: SubscriptionPlan.FAMILY_MONTHLY,
    status: SubscriptionStatus.TRIALING,
    stripeCustomerId,
    currentPeriodStart: now,
    currentPeriodEnd: trialEnd,
    trialEnd,
    cancelAtPeriodEnd: false,
    createdAt: now,
    updatedAt: now,
  }
  await saveSubscription(subscription)

  logger.info('Trial started', { familyId, trialEnd: new Date(trialEnd).toISOString() })
  return subscription
}

// =============================================================================
// Plan Management
// =============================================================================

/**
 * Get all available subscription plans.
 */
export function getAvailablePlans(): PlanDefinition[] {
  return Object.values(SUBSCRIPTION_PLANS)
}

/**
 * Get Stripe price ID for a plan.
 */
export function getStripePriceId(
  plan: SubscriptionPlan,
  interval: BillingInterval
): string | undefined {
  const planDef = SUBSCRIPTION_PLANS[plan]
  return interval === BillingInterval.ANNUAL
    ? planDef.stripePriceIdAnnual
    : planDef.stripePriceIdMonthly
}

// =============================================================================
// Stripe Customer Management
// =============================================================================

/**
 * Create or get Stripe customer for a user.
 */
export async function getOrCreateStripeCustomer(
  userId: string,
  email: string,
  name?: string
): Promise<string> {
  const stripe = getStripe()

  // Check if user already has a customer ID
  const userDoc = await db().collection('users').doc(userId).get()
  const existingCustomerId = userDoc.data()?.stripeCustomerId

  if (existingCustomerId) {
    return existingCustomerId
  }

  // Create new customer
  const customer = await stripe.customers.create({
    email,
    name,
    metadata: {
      userId,
    },
  })

  // Save customer ID to user
  await db().collection('users').doc(userId).update({
    stripeCustomerId: customer.id,
  })

  logger.info('Stripe customer created', { userId, customerId: customer.id })
  return customer.id
}

// =============================================================================
// Checkout Session
// =============================================================================

/**
 * Create a Stripe Checkout session for subscription.
 */
export async function createCheckoutSession(
  familyId: string,
  customerId: string,
  plan: SubscriptionPlan,
  interval: BillingInterval
): Promise<{ sessionId: string; checkoutUrl: string }> {
  const stripe = getStripe()
  const appUrl = APP_URL.value()

  // Get price ID
  const priceId = getStripePriceId(plan, interval)
  if (!priceId) {
    throw new Error(`No Stripe price configured for ${plan} ${interval}`)
  }

  // Create checkout session
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    subscription_data: {
      trial_period_days: TRIAL_DURATION_DAYS,
      metadata: {
        familyId,
      },
    },
    success_url: `${appUrl}/settings/billing?success=true&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/settings/billing?canceled=true`,
    metadata: {
      familyId,
    },
  })

  logger.info('Checkout session created', {
    familyId,
    sessionId: session.id,
    plan,
    interval,
  })

  return {
    sessionId: session.id,
    checkoutUrl: session.url!,
  }
}

// =============================================================================
// Customer Portal
// =============================================================================

/**
 * Create a Stripe Customer Portal session.
 */
export async function createPortalSession(customerId: string): Promise<string> {
  const stripe = getStripe()
  const appUrl = APP_URL.value()

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${appUrl}/settings/billing`,
  })

  return session.url
}

// =============================================================================
// Subscription Management
// =============================================================================

/**
 * Cancel a subscription.
 */
export async function cancelSubscription(
  familyId: string,
  immediate: boolean = false
): Promise<void> {
  const stripe = getStripe()
  const subscription = await getSubscription(familyId)

  if (!subscription?.stripeSubscriptionId) {
    throw new Error('No active subscription found')
  }

  if (immediate) {
    await stripe.subscriptions.cancel(subscription.stripeSubscriptionId)
  } else {
    await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
      cancel_at_period_end: true,
    })
  }

  await saveSubscription({
    ...subscription,
    cancelAtPeriodEnd: !immediate,
    canceledAt: immediate ? Date.now() : undefined,
    status: immediate ? SubscriptionStatus.CANCELED : subscription.status,
    updatedAt: Date.now(),
  })

  logger.info('Subscription cancelled', { familyId, immediate })
}

/**
 * Reactivate a cancelled subscription.
 */
export async function reactivateSubscription(familyId: string): Promise<void> {
  const stripe = getStripe()
  const subscription = await getSubscription(familyId)

  if (!subscription?.stripeSubscriptionId) {
    throw new Error('No subscription found')
  }

  if (!subscription.cancelAtPeriodEnd) {
    throw new Error('Subscription is not cancelled')
  }

  await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
    cancel_at_period_end: false,
  })

  await saveSubscription({
    ...subscription,
    cancelAtPeriodEnd: false,
    canceledAt: undefined,
    updatedAt: Date.now(),
  })

  logger.info('Subscription reactivated', { familyId })
}

// =============================================================================
// Webhook Handling
// =============================================================================

/**
 * Verify and parse Stripe webhook.
 */
export function verifyWebhook(payload: string | Buffer, signature: string): Stripe.Event {
  const stripe = getStripe()
  const secret = STRIPE_WEBHOOK_SECRET.value()

  if (!secret) {
    throw new Error('Stripe webhook secret not configured')
  }

  return stripe.webhooks.constructEvent(payload, signature, secret)
}

/**
 * Handle Stripe subscription events.
 */
export async function handleSubscriptionEvent(event: Stripe.Event): Promise<void> {
  const subscription = event.data.object as Stripe.Subscription
  const familyId = subscription.metadata.familyId

  if (!familyId) {
    logger.warn('Subscription event missing familyId', { subscriptionId: subscription.id })
    return
  }

  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
      await handleSubscriptionUpdate(familyId, subscription)
      break

    case 'customer.subscription.deleted':
      await handleSubscriptionDeleted(familyId, subscription)
      break

    case 'customer.subscription.trial_will_end':
      await handleTrialWillEnd(familyId, subscription)
      break

    default:
      logger.debug('Unhandled subscription event', { type: event.type })
  }
}

async function handleSubscriptionUpdate(
  familyId: string,
  stripeSubscription: Stripe.Subscription
): Promise<void> {
  const status = mapStripeStatus(stripeSubscription.status)
  const firstItem = stripeSubscription.items.data[0]
  const plan = getPlanFromPriceId(firstItem?.price.id)

  // Period dates are on the subscription item in newer Stripe API versions
  const currentPeriodStart = firstItem?.current_period_start ?? stripeSubscription.start_date
  const currentPeriodEnd = firstItem?.current_period_end ?? stripeSubscription.start_date

  const subscription: Subscription = {
    familyId,
    plan: plan || SubscriptionPlan.FAMILY_MONTHLY,
    status,
    stripeCustomerId: stripeSubscription.customer as string,
    stripeSubscriptionId: stripeSubscription.id,
    currentPeriodStart: currentPeriodStart * 1000,
    currentPeriodEnd: currentPeriodEnd * 1000,
    trialEnd: stripeSubscription.trial_end ? stripeSubscription.trial_end * 1000 : undefined,
    cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
    canceledAt: stripeSubscription.canceled_at ? stripeSubscription.canceled_at * 1000 : undefined,
    createdAt: stripeSubscription.created * 1000,
    updatedAt: Date.now(),
  }

  await saveSubscription(subscription)
  logger.info('Subscription updated', { familyId, status, plan })
}

async function handleSubscriptionDeleted(
  familyId: string,
  _stripeSubscription: Stripe.Subscription
): Promise<void> {
  const subscription = await getSubscription(familyId)
  if (subscription) {
    await saveSubscription({
      ...subscription,
      status: SubscriptionStatus.EXPIRED,
      updatedAt: Date.now(),
    })
  }
  logger.info('Subscription expired', { familyId })
}

async function handleTrialWillEnd(
  familyId: string,
  stripeSubscription: Stripe.Subscription
): Promise<void> {
  // TODO: Send trial ending notification email
  logger.info('Trial will end', {
    familyId,
    trialEnd: stripeSubscription.trial_end
      ? new Date(stripeSubscription.trial_end * 1000).toISOString()
      : undefined,
  })
}

function mapStripeStatus(stripeStatus: Stripe.Subscription.Status): SubscriptionStatus {
  switch (stripeStatus) {
    case 'trialing':
      return SubscriptionStatus.TRIALING
    case 'active':
      return SubscriptionStatus.ACTIVE
    case 'past_due':
      return SubscriptionStatus.PAST_DUE
    case 'canceled':
      return SubscriptionStatus.CANCELED
    case 'unpaid':
    case 'incomplete':
    case 'incomplete_expired':
    case 'paused':
      return SubscriptionStatus.EXPIRED
    default:
      return SubscriptionStatus.EXPIRED
  }
}

function getPlanFromPriceId(priceId: string | undefined): SubscriptionPlan | undefined {
  if (!priceId) return undefined

  for (const planDef of Object.values(SUBSCRIPTION_PLANS) as PlanDefinition[]) {
    if (planDef.stripePriceIdMonthly === priceId) {
      return planDef.id
    }
    if (planDef.stripePriceIdAnnual === priceId) {
      return planDef.id
    }
  }
  return undefined
}

// =============================================================================
// Feature Gating
// =============================================================================

/**
 * Check if a family has access to a feature.
 */
export async function hasFeatureAccess(
  familyId: string,
  feature: 'aiClassification' | 'timeLimits' | 'caregiverAccess' | 'locationFeatures'
): Promise<boolean> {
  const subscription = await getSubscription(familyId)

  if (!subscription) {
    return false
  }

  // Check if subscription is active
  if (
    subscription.status !== SubscriptionStatus.ACTIVE &&
    subscription.status !== SubscriptionStatus.TRIALING
  ) {
    return false
  }

  // Check plan features
  const planDef = SUBSCRIPTION_PLANS[subscription.plan]
  return planDef.features[feature] ?? false
}

/**
 * Check if family can add more children.
 */
export async function canAddMoreChildren(familyId: string, currentCount: number): Promise<boolean> {
  const subscription = await getSubscription(familyId)
  if (!subscription) {
    return currentCount < 1 // Default to free tier limit
  }

  const maxChildren = SUBSCRIPTION_PLANS[subscription.plan].features.maxChildren
  return maxChildren === -1 || currentCount < maxChildren
}

/**
 * Check if family can add more devices.
 */
export async function canAddMoreDevices(familyId: string, currentCount: number): Promise<boolean> {
  const subscription = await getSubscription(familyId)
  if (!subscription) {
    return currentCount < 1 // Default to free tier limit
  }

  const maxDevices = SUBSCRIPTION_PLANS[subscription.plan].features.maxDevices
  return maxDevices === -1 || currentCount < maxDevices
}
