/**
 * Subscription Contracts
 * Epic 50: SaaS Subscription Management
 *
 * Defines subscription plans, statuses, and related types for the
 * fledgely SaaS billing system.
 */

import { z } from 'zod'

// =============================================================================
// Enums
// =============================================================================

/**
 * Available subscription plans.
 * FR135: Family-only plans (no enterprise/school)
 */
export enum SubscriptionPlan {
  FREE = 'free',
  FAMILY_MONTHLY = 'family_monthly',
  FAMILY_ANNUAL = 'family_annual',
}

/**
 * Subscription status values.
 */
export enum SubscriptionStatus {
  /** Active trial period */
  TRIALING = 'trialing',
  /** Active paid subscription */
  ACTIVE = 'active',
  /** Payment failed, in grace period */
  PAST_DUE = 'past_due',
  /** Subscription cancelled, still active until period end */
  CANCELED = 'canceled',
  /** Subscription ended */
  EXPIRED = 'expired',
  /** Free tier (no payment) */
  FREE = 'free',
}

/**
 * Billing interval for subscriptions.
 */
export enum BillingInterval {
  MONTHLY = 'monthly',
  ANNUAL = 'annual',
}

// =============================================================================
// Plan Configuration
// =============================================================================

/**
 * Features available in a subscription plan.
 */
export interface PlanFeatures {
  /** Maximum number of children allowed */
  maxChildren: number
  /** Maximum number of devices allowed */
  maxDevices: number
  /** Screenshot capture enabled */
  screenshotCapture: boolean
  /** AI classification enabled */
  aiClassification: boolean
  /** Time limits enabled */
  timeLimits: boolean
  /** Focus/work modes enabled */
  focusModes: boolean
  /** Caregiver access enabled */
  caregiverAccess: boolean
  /** Location features enabled */
  locationFeatures: boolean
  /** Priority support */
  prioritySupport: boolean
}

/**
 * Subscription plan definition.
 */
export interface PlanDefinition {
  /** Plan identifier */
  id: SubscriptionPlan
  /** Display name */
  name: string
  /** Description */
  description: string
  /** Monthly price in cents (USD) */
  priceMonthly: number
  /** Annual price in cents (USD) - includes discount */
  priceAnnual: number
  /** Billing interval */
  interval: BillingInterval
  /** Features included */
  features: PlanFeatures
  /** Stripe price ID for monthly billing */
  stripePriceIdMonthly?: string
  /** Stripe price ID for annual billing */
  stripePriceIdAnnual?: string
}

/**
 * Plan definitions with pricing and features.
 * FR97: Subscription plans
 * AC5: Annual discount (20% off)
 */
export const SUBSCRIPTION_PLANS: Record<SubscriptionPlan, PlanDefinition> = {
  [SubscriptionPlan.FREE]: {
    id: SubscriptionPlan.FREE,
    name: 'Free',
    description: 'Basic monitoring for one child',
    priceMonthly: 0,
    priceAnnual: 0,
    interval: BillingInterval.MONTHLY,
    features: {
      maxChildren: 1,
      maxDevices: 1,
      screenshotCapture: true,
      aiClassification: false,
      timeLimits: false,
      focusModes: false,
      caregiverAccess: false,
      locationFeatures: false,
      prioritySupport: false,
    },
  },
  [SubscriptionPlan.FAMILY_MONTHLY]: {
    id: SubscriptionPlan.FAMILY_MONTHLY,
    name: 'Family',
    description: 'Full features for the whole family',
    priceMonthly: 999, // $9.99/month
    priceAnnual: 9590, // $95.90/year (20% discount from $119.88)
    interval: BillingInterval.MONTHLY,
    features: {
      maxChildren: -1, // Unlimited
      maxDevices: -1, // Unlimited
      screenshotCapture: true,
      aiClassification: true,
      timeLimits: true,
      focusModes: true,
      caregiverAccess: true,
      locationFeatures: true,
      prioritySupport: true,
    },
  },
  [SubscriptionPlan.FAMILY_ANNUAL]: {
    id: SubscriptionPlan.FAMILY_ANNUAL,
    name: 'Family (Annual)',
    description: 'Full features with 20% annual discount',
    priceMonthly: 799, // Effective $7.99/month
    priceAnnual: 9590, // $95.90/year
    interval: BillingInterval.ANNUAL,
    features: {
      maxChildren: -1, // Unlimited
      maxDevices: -1, // Unlimited
      screenshotCapture: true,
      aiClassification: true,
      timeLimits: true,
      focusModes: true,
      caregiverAccess: true,
      locationFeatures: true,
      prioritySupport: true,
    },
  },
}

// =============================================================================
// Subscription Document
// =============================================================================

/**
 * Subscription document stored in Firestore.
 * Path: subscriptions/{familyId}
 */
export interface Subscription {
  /** Family ID */
  familyId: string
  /** Current plan */
  plan: SubscriptionPlan
  /** Subscription status */
  status: SubscriptionStatus
  /** Stripe customer ID */
  stripeCustomerId?: string
  /** Stripe subscription ID */
  stripeSubscriptionId?: string
  /** Current period start (epoch ms) */
  currentPeriodStart: number
  /** Current period end (epoch ms) */
  currentPeriodEnd: number
  /** Trial end date (epoch ms) if trialing */
  trialEnd?: number
  /** Cancellation date if cancelled */
  canceledAt?: number
  /** Whether subscription will cancel at period end */
  cancelAtPeriodEnd: boolean
  /** Created timestamp */
  createdAt: number
  /** Updated timestamp */
  updatedAt: number
}

// =============================================================================
// Zod Schemas
// =============================================================================

export const subscriptionPlanSchema = z.nativeEnum(SubscriptionPlan)

export const subscriptionStatusSchema = z.nativeEnum(SubscriptionStatus)

export const subscriptionSchema = z.object({
  familyId: z.string(),
  plan: subscriptionPlanSchema,
  status: subscriptionStatusSchema,
  stripeCustomerId: z.string().optional(),
  stripeSubscriptionId: z.string().optional(),
  currentPeriodStart: z.number(),
  currentPeriodEnd: z.number(),
  trialEnd: z.number().optional(),
  canceledAt: z.number().optional(),
  cancelAtPeriodEnd: z.boolean(),
  createdAt: z.number(),
  updatedAt: z.number(),
})

// =============================================================================
// API Request/Response Types
// =============================================================================

/**
 * Response for getPlans callable.
 */
export interface GetPlansResponse {
  plans: PlanDefinition[]
  currentPlan?: SubscriptionPlan
}

/**
 * Request for createSubscription callable.
 */
export interface CreateSubscriptionInput {
  plan: SubscriptionPlan
  billingInterval: BillingInterval
}

export const createSubscriptionInputSchema = z.object({
  plan: subscriptionPlanSchema,
  billingInterval: z.nativeEnum(BillingInterval),
})

/**
 * Response for createSubscription callable.
 */
export interface CreateSubscriptionResponse {
  /** Stripe Checkout session URL */
  checkoutUrl: string
  /** Session ID for verification */
  sessionId: string
}

/**
 * Request for cancelSubscription callable.
 */
export interface CancelSubscriptionInput {
  /** Cancel immediately or at period end */
  immediate: boolean
}

export const cancelSubscriptionInputSchema = z.object({
  immediate: z.boolean().default(false),
})

/**
 * Response for subscription management portal.
 */
export interface ManageSubscriptionResponse {
  /** Stripe Customer Portal URL */
  portalUrl: string
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get plan features for a given plan.
 */
export function getPlanFeatures(plan: SubscriptionPlan): PlanFeatures {
  return SUBSCRIPTION_PLANS[plan].features
}

/**
 * Check if a feature is available for a plan.
 */
export function hasFeature(plan: SubscriptionPlan, feature: keyof PlanFeatures): boolean {
  const features = getPlanFeatures(plan)
  const value = features[feature]
  return typeof value === 'boolean' ? value : value !== 0
}

/**
 * Check if subscription allows adding more children.
 */
export function canAddChild(plan: SubscriptionPlan, currentCount: number): boolean {
  const maxChildren = getPlanFeatures(plan).maxChildren
  return maxChildren === -1 || currentCount < maxChildren
}

/**
 * Check if subscription allows adding more devices.
 */
export function canAddDevice(plan: SubscriptionPlan, currentCount: number): boolean {
  const maxDevices = getPlanFeatures(plan).maxDevices
  return maxDevices === -1 || currentCount < maxDevices
}

/**
 * Calculate annual savings percentage.
 */
export function getAnnualSavingsPercent(): number {
  const monthly = SUBSCRIPTION_PLANS[SubscriptionPlan.FAMILY_MONTHLY]
  const annual = SUBSCRIPTION_PLANS[SubscriptionPlan.FAMILY_ANNUAL]
  const monthlyTotal = monthly.priceMonthly * 12
  const savings = ((monthlyTotal - annual.priceAnnual) / monthlyTotal) * 100
  return Math.round(savings)
}

/**
 * Format price for display.
 */
export function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

/**
 * Check if subscription is active (trialing or active).
 */
export function isSubscriptionActive(status: SubscriptionStatus): boolean {
  return status === SubscriptionStatus.TRIALING || status === SubscriptionStatus.ACTIVE
}

/**
 * Trial duration in days.
 */
export const TRIAL_DURATION_DAYS = 14
