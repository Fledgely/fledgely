/**
 * Subscription Callable Functions
 * Epic 50: SaaS Subscription Management
 *
 * Cloud Functions for subscription plan management and billing.
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https'
import * as logger from 'firebase-functions/logger'
import { getFirestore } from 'firebase-admin/firestore'
import {
  SubscriptionPlan,
  BillingInterval,
  GetPlansResponse,
  CreateSubscriptionResponse,
  ManageSubscriptionResponse,
  createSubscriptionInputSchema,
  cancelSubscriptionInputSchema,
} from '@fledgely/shared'
import * as subscriptionService from '../services/subscriptionService'

// =============================================================================
// Get Plans
// =============================================================================

/**
 * Get available subscription plans.
 * Story 50.1: Subscription plan selection
 */
export const getSubscriptionPlans = onCall<void, Promise<GetPlansResponse>>(
  {
    memory: '256MiB',
    timeoutSeconds: 30,
  },
  async (request) => {
    // Auth is optional for viewing plans
    const userId = request.auth?.uid

    let currentPlan: SubscriptionPlan | undefined

    if (userId) {
      try {
        // Get user's family
        const userDoc = await getFirestore().collection('users').doc(userId).get()
        const familyId = userDoc.data()?.familyId

        if (familyId) {
          const subscription = await subscriptionService.getSubscription(familyId)
          currentPlan = subscription?.plan
        }
      } catch (error) {
        logger.warn('Error getting current plan', { error, userId })
      }
    }

    return {
      plans: subscriptionService.getAvailablePlans(),
      currentPlan,
    }
  }
)

// =============================================================================
// Get Current Subscription
// =============================================================================

/**
 * Get the current user's subscription details.
 */
export const getCurrentSubscription = onCall(
  {
    memory: '256MiB',
    timeoutSeconds: 30,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be logged in')
    }

    const userId = request.auth.uid

    // Get user's family
    const userDoc = await getFirestore().collection('users').doc(userId).get()
    const familyId = userDoc.data()?.familyId

    if (!familyId) {
      return { subscription: null }
    }

    const subscription = await subscriptionService.getSubscription(familyId)
    return { subscription }
  }
)

// =============================================================================
// Create Subscription (Start Checkout)
// =============================================================================

/**
 * Create a new subscription via Stripe Checkout.
 * Story 50.3: Stripe payment integration
 */
export const createSubscription = onCall<
  { plan: SubscriptionPlan; billingInterval: BillingInterval },
  Promise<CreateSubscriptionResponse>
>(
  {
    memory: '256MiB',
    timeoutSeconds: 60,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be logged in')
    }

    // Check if Stripe is configured
    if (!subscriptionService.isStripeConfigured()) {
      throw new HttpsError(
        'failed-precondition',
        'Payment system not configured. Please contact support.'
      )
    }

    // Validate input
    const parseResult = createSubscriptionInputSchema.safeParse(request.data)
    if (!parseResult.success) {
      throw new HttpsError('invalid-argument', 'Invalid plan or billing interval')
    }

    const { plan, billingInterval } = parseResult.data
    const userId = request.auth.uid

    // Get user and family
    const userDoc = await getFirestore().collection('users').doc(userId).get()
    const userData = userDoc.data()

    if (!userData) {
      throw new HttpsError('not-found', 'User not found')
    }

    const familyId = userData.familyId
    if (!familyId) {
      throw new HttpsError('failed-precondition', 'Must have a family to subscribe')
    }

    // Validate plan
    if (plan === SubscriptionPlan.FREE) {
      throw new HttpsError('invalid-argument', 'Cannot checkout for free plan')
    }

    // Create or get Stripe customer
    const customerId = await subscriptionService.getOrCreateStripeCustomer(
      userId,
      userData.email,
      userData.displayName
    )

    // Create checkout session
    const { sessionId, checkoutUrl } = await subscriptionService.createCheckoutSession(
      familyId,
      customerId,
      plan,
      billingInterval
    )

    logger.info('Checkout session created', { userId, familyId, plan, billingInterval })

    return { sessionId, checkoutUrl }
  }
)

// =============================================================================
// Manage Subscription (Customer Portal)
// =============================================================================

/**
 * Get a link to the Stripe Customer Portal for billing management.
 * Story 50.4: Billing management portal
 */
export const manageSubscription = onCall<void, Promise<ManageSubscriptionResponse>>(
  {
    memory: '256MiB',
    timeoutSeconds: 30,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be logged in')
    }

    if (!subscriptionService.isStripeConfigured()) {
      throw new HttpsError(
        'failed-precondition',
        'Payment system not configured. Please contact support.'
      )
    }

    const userId = request.auth.uid

    // Get user's Stripe customer ID
    const userDoc = await getFirestore().collection('users').doc(userId).get()
    const customerId = userDoc.data()?.stripeCustomerId

    if (!customerId) {
      throw new HttpsError('not-found', 'No billing account found')
    }

    const portalUrl = await subscriptionService.createPortalSession(customerId)

    return { portalUrl }
  }
)

// =============================================================================
// Cancel Subscription
// =============================================================================

/**
 * Cancel the current subscription.
 * Story 50.5: Subscription cancellation
 */
export const cancelSubscriptionCallable = onCall<{ immediate?: boolean }>(
  {
    memory: '256MiB',
    timeoutSeconds: 30,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be logged in')
    }

    if (!subscriptionService.isStripeConfigured()) {
      throw new HttpsError(
        'failed-precondition',
        'Payment system not configured. Please contact support.'
      )
    }

    // Validate input
    const parseResult = cancelSubscriptionInputSchema.safeParse(request.data || {})
    if (!parseResult.success) {
      throw new HttpsError('invalid-argument', 'Invalid cancellation request')
    }

    const { immediate } = parseResult.data
    const userId = request.auth.uid

    // Get user's family
    const userDoc = await getFirestore().collection('users').doc(userId).get()
    const familyId = userDoc.data()?.familyId

    if (!familyId) {
      throw new HttpsError('not-found', 'No family found')
    }

    // Check if user is a guardian (can manage billing)
    const familyDoc = await getFirestore().collection('families').doc(familyId).get()
    const guardians = familyDoc.data()?.guardians || []

    if (!guardians.includes(userId)) {
      throw new HttpsError('permission-denied', 'Only guardians can cancel subscriptions')
    }

    await subscriptionService.cancelSubscription(familyId, immediate)

    logger.info('Subscription cancelled', { userId, familyId, immediate })

    return { success: true }
  }
)

// =============================================================================
// Reactivate Subscription
// =============================================================================

/**
 * Reactivate a cancelled subscription before it expires.
 */
export const reactivateSubscriptionCallable = onCall(
  {
    memory: '256MiB',
    timeoutSeconds: 30,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be logged in')
    }

    if (!subscriptionService.isStripeConfigured()) {
      throw new HttpsError(
        'failed-precondition',
        'Payment system not configured. Please contact support.'
      )
    }

    const userId = request.auth.uid

    // Get user's family
    const userDoc = await getFirestore().collection('users').doc(userId).get()
    const familyId = userDoc.data()?.familyId

    if (!familyId) {
      throw new HttpsError('not-found', 'No family found')
    }

    // Check if user is a guardian
    const familyDoc = await getFirestore().collection('families').doc(familyId).get()
    const guardians = familyDoc.data()?.guardians || []

    if (!guardians.includes(userId)) {
      throw new HttpsError('permission-denied', 'Only guardians can manage subscriptions')
    }

    await subscriptionService.reactivateSubscription(familyId)

    logger.info('Subscription reactivated', { userId, familyId })

    return { success: true }
  }
)

// =============================================================================
// Check Feature Access
// =============================================================================

/**
 * Check if the user's family has access to a specific feature.
 */
export const checkFeatureAccess = onCall<{
  feature: 'aiClassification' | 'timeLimits' | 'caregiverAccess' | 'locationFeatures'
}>(
  {
    memory: '256MiB',
    timeoutSeconds: 30,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be logged in')
    }

    const { feature } = request.data

    if (!feature) {
      throw new HttpsError('invalid-argument', 'Feature name required')
    }

    const userId = request.auth.uid

    // Get user's family
    const userDoc = await getFirestore().collection('users').doc(userId).get()
    const familyId = userDoc.data()?.familyId

    if (!familyId) {
      return { hasAccess: false, reason: 'no_family' }
    }

    const hasAccess = await subscriptionService.hasFeatureAccess(familyId, feature)

    return {
      hasAccess,
      reason: hasAccess ? undefined : 'plan_limit',
    }
  }
)

// =============================================================================
// Start Free Trial
// =============================================================================

/**
 * Start a free trial for the family.
 * Story 50.2: Trial period
 */
// =============================================================================
// Organizational Use Prevention
// =============================================================================

/**
 * Check if family requires attestation.
 * Story 50.7: Organizational Use Prevention
 */
export const checkAttestationRequired = onCall(
  {
    memory: '256MiB',
    timeoutSeconds: 30,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be logged in')
    }

    const userId = request.auth.uid

    // Get user's family
    const userDoc = await getFirestore().collection('users').doc(userId).get()
    const familyId = userDoc.data()?.familyId

    if (!familyId) {
      return { required: false }
    }

    const required = await subscriptionService.requiresAttestation(familyId)
    const patterns = await subscriptionService.checkOrganizationalPatterns(familyId)

    return {
      required,
      isLargeAccount: patterns.isLargeAccount,
      hasBusinessEmail: patterns.hasBusinessEmail,
    }
  }
)

/**
 * Submit family attestation.
 * Story 50.7: Organizational Use Prevention - AC2
 */
export const submitFamilyAttestation = onCall(
  {
    memory: '256MiB',
    timeoutSeconds: 30,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be logged in')
    }

    const userId = request.auth.uid

    // Get user's family
    const userDoc = await getFirestore().collection('users').doc(userId).get()
    const familyId = userDoc.data()?.familyId

    if (!familyId) {
      throw new HttpsError('not-found', 'No family found')
    }

    // Check if user is a guardian
    const familyDoc = await getFirestore().collection('families').doc(familyId).get()
    const guardians = familyDoc.data()?.guardians || []

    if (!guardians.includes(userId)) {
      throw new HttpsError('permission-denied', 'Only guardians can submit attestation')
    }

    await subscriptionService.recordAttestation(familyId, userId)

    logger.info('Family attestation submitted', { userId, familyId })

    return { success: true }
  }
)

// =============================================================================
// Free Trial
// =============================================================================

export const startFreeTrial = onCall(
  {
    memory: '256MiB',
    timeoutSeconds: 60,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be logged in')
    }

    if (!subscriptionService.isStripeConfigured()) {
      throw new HttpsError(
        'failed-precondition',
        'Payment system not configured. Please contact support.'
      )
    }

    const userId = request.auth.uid

    // Get user and family
    const userDoc = await getFirestore().collection('users').doc(userId).get()
    const userData = userDoc.data()

    if (!userData) {
      throw new HttpsError('not-found', 'User not found')
    }

    const familyId = userData.familyId
    if (!familyId) {
      throw new HttpsError('failed-precondition', 'Must have a family to start trial')
    }

    // Check if already has a subscription
    const existing = await subscriptionService.getSubscription(familyId)
    if (existing && existing.plan !== SubscriptionPlan.FREE) {
      throw new HttpsError('already-exists', 'Family already has a subscription')
    }

    // Create Stripe customer if needed
    const customerId = await subscriptionService.getOrCreateStripeCustomer(
      userId,
      userData.email,
      userData.displayName
    )

    // Start trial
    const subscription = await subscriptionService.startTrial(familyId, customerId)

    logger.info('Free trial started', { userId, familyId })

    return { subscription }
  }
)
