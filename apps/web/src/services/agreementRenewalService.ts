/**
 * Agreement Renewal Service - Story 35.3
 *
 * Service for managing agreement renewal flow.
 * AC1: Renewal mode options (renew-as-is, renew-with-changes)
 * AC2: Renew as-is extends expiry with same terms
 * AC4: Child must consent to renewal
 * AC5: Both signatures required
 * AC6: New expiry date calculation
 */

import {
  calculateRenewalExpiryDate,
  getRenewalModeConfig,
  RENEWAL_MODES,
  type RenewalMode,
  type RenewalStatus,
  type ExpiryDuration,
} from '@fledgely/shared'

/**
 * Consent information for a signature.
 */
export interface ConsentInfo {
  signature: string
  signedAt: Date
}

/**
 * State of an in-progress renewal.
 */
export interface RenewalState {
  agreementId: string
  mode: RenewalMode
  status: RenewalStatus
  initiatedAt: Date
  parentConsent: ConsentInfo | null
  childConsent: ConsentInfo | null
  newExpiryDate: Date | null
  completedAt?: Date
  cancelledAt?: Date
}

/**
 * Status information for a renewal.
 */
export interface RenewalStatusInfo {
  status: RenewalStatus
  parentSigned: boolean
  childSigned: boolean
  newExpiryDate: Date | null
}

/**
 * Input for initiating a renewal.
 */
export interface InitiateRenewalInput {
  agreementId: string
  mode: RenewalMode
  duration: ExpiryDuration
  currentExpiryDate?: Date
}

/**
 * Renewal mode option for UI display.
 */
export interface RenewalModeOption {
  mode: RenewalMode
  title: string
  description: string
  requiresModificationFlow: boolean
}

/**
 * Next step in renewal flow.
 */
export type RenewalStep = 'parent-sign' | 'child-consent' | 'complete' | 'done' | 'cancelled'

/**
 * Initiate a new renewal process.
 * AC1: Creates renewal with selected mode
 * AC6: Calculates new expiry date
 *
 * @param input - Renewal initialization input
 * @returns Initial renewal state
 */
export function initiateRenewal(input: InitiateRenewalInput): RenewalState {
  const { agreementId, mode, duration, currentExpiryDate } = input

  // Calculate new expiry date
  const baseDate = currentExpiryDate ?? new Date()
  const newExpiryDate = calculateRenewalExpiryDate(baseDate, duration)

  return {
    agreementId,
    mode,
    status: 'parent-initiated',
    initiatedAt: new Date(),
    parentConsent: null,
    childConsent: null,
    newExpiryDate,
  }
}

/**
 * Get the current status of a renewal.
 *
 * @param renewal - Renewal state
 * @returns Status information
 */
export function getRenewalStatus(renewal: RenewalState): RenewalStatusInfo {
  return {
    status: renewal.status,
    parentSigned: renewal.parentConsent !== null,
    childSigned: renewal.childConsent !== null,
    newExpiryDate: renewal.newExpiryDate,
  }
}

/**
 * Process parent consent/signature.
 * AC5: Parent signature required
 *
 * @param renewal - Current renewal state
 * @param signature - Parent's signature
 * @returns Updated renewal state
 */
export function processParentConsent(renewal: RenewalState, signature: string): RenewalState {
  // Don't overwrite existing consent
  if (renewal.parentConsent !== null) {
    return renewal
  }

  return {
    ...renewal,
    parentConsent: {
      signature,
      signedAt: new Date(),
    },
    status: 'child-consenting',
  }
}

/**
 * Process child consent/signature.
 * AC4: Child must consent to renewal
 * AC5: Both signatures required
 *
 * @param renewal - Current renewal state
 * @param signature - Child's signature
 * @returns Updated renewal state
 */
export function processChildConsent(renewal: RenewalState, signature: string): RenewalState {
  // Can't record child consent before parent
  if (renewal.parentConsent === null) {
    return renewal
  }

  // Don't overwrite existing consent
  if (renewal.childConsent !== null) {
    return renewal
  }

  return {
    ...renewal,
    childConsent: {
      signature,
      signedAt: new Date(),
    },
  }
}

/**
 * Complete the renewal process.
 * AC5: Both signatures required
 * AC6: New expiry date set upon completion
 *
 * @param renewal - Current renewal state
 * @returns Updated renewal state (completed if valid)
 */
export function completeRenewal(renewal: RenewalState): RenewalState {
  // Can't complete without both signatures
  if (!canCompleteRenewal(renewal)) {
    return renewal
  }

  return {
    ...renewal,
    status: 'completed',
    completedAt: new Date(),
  }
}

/**
 * Cancel the renewal process.
 *
 * @param renewal - Current renewal state
 * @returns Updated renewal state (cancelled if allowed)
 */
export function cancelRenewal(renewal: RenewalState): RenewalState {
  // Can't cancel completed renewal
  if (renewal.status === 'completed') {
    return renewal
  }

  return {
    ...renewal,
    status: 'cancelled',
    cancelledAt: new Date(),
  }
}

/**
 * Check if renewal can be completed.
 * AC4, AC5: Both parent and child must sign
 *
 * @param renewal - Renewal state to check
 * @returns True if both signatures present
 */
export function canCompleteRenewal(renewal: RenewalState): boolean {
  return renewal.parentConsent !== null && renewal.childConsent !== null
}

/**
 * Get available renewal mode options.
 * AC1: "Renew as-is" or "Renew with changes"
 *
 * @returns Array of mode options
 */
export function getRenewalModeOptions(): RenewalModeOption[] {
  const modes: RenewalMode[] = [
    RENEWAL_MODES.RENEW_AS_IS as RenewalMode,
    RENEWAL_MODES.RENEW_WITH_CHANGES as RenewalMode,
  ]

  return modes.map((mode) => {
    const config = getRenewalModeConfig(mode)
    return {
      mode: config.mode,
      title: config.title,
      description: config.description,
      requiresModificationFlow: config.requiresModificationFlow,
    }
  })
}

/**
 * Get the next step in the renewal flow.
 *
 * @param renewal - Current renewal state
 * @returns Next step identifier
 */
export function getNextRenewalStep(renewal: RenewalState): RenewalStep {
  if (renewal.status === 'completed') {
    return 'done'
  }

  if (renewal.status === 'cancelled') {
    return 'cancelled'
  }

  // Check if both have signed
  if (renewal.parentConsent && renewal.childConsent) {
    return 'complete'
  }

  // Check if parent has signed
  if (renewal.parentConsent) {
    return 'child-consent'
  }

  // Parent needs to sign first
  return 'parent-sign'
}
