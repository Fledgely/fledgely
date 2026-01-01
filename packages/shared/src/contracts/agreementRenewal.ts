/**
 * Agreement Renewal Types and Constants - Story 35.3
 *
 * Types, schemas, and utilities for agreement renewal flow.
 * AC1: Renewal mode options (renew-as-is, renew-with-changes)
 * AC2: Renew as-is extends expiry with same terms
 * AC4: Child must consent to renewal
 * AC5: Both signatures required
 * AC6: New expiry date calculation
 */

import { z } from 'zod'
import { type ExpiryDuration } from './agreementExpiry'

/**
 * Renewal mode options.
 * AC1: "Renew as-is" or "Renew with changes"
 */
export const renewalModeSchema = z.enum(['renew-as-is', 'renew-with-changes'])

export type RenewalMode = z.infer<typeof renewalModeSchema>

/**
 * Renewal status options.
 */
export const renewalStatusSchema = z.enum([
  'pending',
  'parent-initiated',
  'child-consenting',
  'completed',
  'cancelled',
])

export type RenewalStatus = z.infer<typeof renewalStatusSchema>

/**
 * Renewal initiator options.
 */
export const renewalInitiatorSchema = z.enum(['parent', 'system'])

export type RenewalInitiator = z.infer<typeof renewalInitiatorSchema>

/**
 * Renewal request schema.
 */
export const renewalRequestSchema = z.object({
  agreementId: z.string(),
  mode: renewalModeSchema,
  initiatedBy: renewalInitiatorSchema,
  initiatedAt: z.date(),
  newExpiryDate: z.date().optional(),
})

export type RenewalRequest = z.infer<typeof renewalRequestSchema>

/**
 * Consent role options.
 */
export const consentRoleSchema = z.enum(['parent', 'child'])

export type ConsentRole = z.infer<typeof consentRoleSchema>

/**
 * Renewal consent schema.
 * AC4, AC5: Both parent and child must consent
 */
export const renewalConsentSchema = z.object({
  renewalId: z.string(),
  role: consentRoleSchema,
  consentedAt: z.date(),
  signature: z.string(),
})

export type RenewalConsent = z.infer<typeof renewalConsentSchema>

/**
 * Renewal mode constants.
 */
export const RENEWAL_MODES = {
  RENEW_AS_IS: 'renew-as-is',
  RENEW_WITH_CHANGES: 'renew-with-changes',
} as const

/**
 * Renewal status constants.
 */
export const RENEWAL_STATUS = {
  PENDING: 'pending',
  PARENT_INITIATED: 'parent-initiated',
  CHILD_CONSENTING: 'child-consenting',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const

/**
 * Renewal mode configuration.
 */
export interface RenewalModeConfig {
  mode: RenewalMode
  title: string
  description: string
  requiresModificationFlow: boolean
}

/**
 * Renewal messages for UI display.
 */
export const RENEWAL_MESSAGES = {
  modes: {
    'renew-as-is': {
      title: 'Renew As-Is',
      description: 'Keep the same terms and extend your agreement.',
    },
    'renew-with-changes': {
      title: 'Renew with Changes',
      description: 'Make modifications to the agreement terms before renewing.',
    },
  },
  status: {
    pending: 'Renewal pending',
    'parent-initiated': 'Waiting for child consent',
    'child-consenting': 'Child reviewing renewal',
    completed: 'Renewal complete',
    cancelled: 'Renewal cancelled',
  },
  consent: {
    parentPrompt: 'Confirm renewal of this agreement',
    childPrompt: 'Your parent wants to renew the agreement. Do you agree?',
    completed: 'Both signatures received - renewal complete!',
  },
} as const

/**
 * Renewal mode configurations.
 */
const RENEWAL_MODE_CONFIGS: Record<RenewalMode, RenewalModeConfig> = {
  'renew-as-is': {
    mode: 'renew-as-is',
    title: RENEWAL_MESSAGES.modes['renew-as-is'].title,
    description: RENEWAL_MESSAGES.modes['renew-as-is'].description,
    requiresModificationFlow: false,
  },
  'renew-with-changes': {
    mode: 'renew-with-changes',
    title: RENEWAL_MESSAGES.modes['renew-with-changes'].title,
    description: RENEWAL_MESSAGES.modes['renew-with-changes'].description,
    requiresModificationFlow: true,
  },
}

/**
 * Calculate the new expiry date for a renewal.
 * AC6: New expiry date set upon renewal completion
 *
 * @param currentExpiry - Current agreement expiry date
 * @param duration - Duration for renewal
 * @returns New expiry date or null for no-expiry
 */
export function calculateRenewalExpiryDate(
  currentExpiry: Date,
  duration: ExpiryDuration
): Date | null {
  if (duration === 'no-expiry') {
    return null
  }

  // Use today or current expiry, whichever is later
  const now = new Date()
  const startDate = currentExpiry > now ? currentExpiry : now

  const newExpiry = new Date(startDate)

  switch (duration) {
    case '3-months':
      newExpiry.setMonth(newExpiry.getMonth() + 3)
      break
    case '6-months':
      newExpiry.setMonth(newExpiry.getMonth() + 6)
      break
    case '1-year':
      newExpiry.setFullYear(newExpiry.getFullYear() + 1)
      break
  }

  return newExpiry
}

/**
 * Agreement info for eligibility check.
 */
interface AgreementForEligibility {
  status: string
  expiryDate: Date | null
}

/**
 * Check if an agreement is eligible for renewal.
 *
 * @param agreement - Agreement to check
 * @returns True if eligible for renewal
 */
export function isEligibleForRenewal(agreement: AgreementForEligibility): boolean {
  // Must be active status
  if (agreement.status !== 'active') {
    return false
  }

  // Must have an expiry date (no-expiry agreements don't need renewal)
  if (!agreement.expiryDate) {
    return false
  }

  return true
}

/**
 * Agreement info for renew-as-is check.
 */
interface AgreementForRenewAsIs {
  status: string
  hasPendingChanges?: boolean
}

/**
 * Check if an agreement can be renewed as-is.
 * AC2: "Renew as-is" extends expiry with same terms
 *
 * @param agreement - Agreement to check
 * @returns True if can renew as-is
 */
export function canRenewAsIs(agreement: AgreementForRenewAsIs): boolean {
  // Cannot renew as-is if there are pending changes
  if (agreement.hasPendingChanges === true) {
    return false
  }

  return true
}

/**
 * Get the configuration for a renewal mode.
 *
 * @param mode - Renewal mode
 * @returns Mode configuration
 */
export function getRenewalModeConfig(mode: RenewalMode): RenewalModeConfig {
  return RENEWAL_MODE_CONFIGS[mode]
}

/**
 * Renewal info for completion check.
 */
interface RenewalForCompletion {
  status: string
  parentConsent: { signature: string; consentedAt: Date } | null
  childConsent: { signature: string; consentedAt: Date } | null
}

/**
 * Check if a renewal has all required consents.
 * AC4: Child must consent to renewal
 * AC5: Both signatures required
 *
 * @param renewal - Renewal to check
 * @returns True if both consents received
 */
export function isRenewalComplete(renewal: RenewalForCompletion): boolean {
  return renewal.parentConsent !== null && renewal.childConsent !== null
}
