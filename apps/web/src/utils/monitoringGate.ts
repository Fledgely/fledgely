'use client'

/**
 * Monitoring Gate Utility
 *
 * Provides client-side validation for the monitoring gate requirement (Story 2.3, AC7):
 * Device monitoring CANNOT be started until custody is declared for the child.
 *
 * This utility provides:
 * - Client-side validation before attempting device enrollment
 * - User-friendly error messages at 6th-grade reading level
 * - Redirect helpers for the custody declaration flow
 *
 * Server-side enforcement is handled by Firestore security rules in the
 * devices collection (to be implemented in Epic 9/12).
 *
 * @see packages/contracts/src/child.schema.ts - canStartMonitoring() helper
 * @see packages/firebase-rules/firestore.rules - DEVICES COLLECTION placeholder
 */

import { canStartMonitoring, type ChildProfile } from '@fledgely/contracts'

/**
 * Result of monitoring gate validation
 */
export interface MonitoringGateResult {
  /** Whether monitoring can proceed */
  canProceed: boolean
  /** User-friendly error message if blocked (6th-grade reading level) */
  message: string | null
  /** Redirect URL to resolve the blocking condition */
  redirectUrl: string | null
  /** The specific reason for blocking */
  blockingReason: 'no-custody' | 'no-child' | null
}

/**
 * Error messages at 6th-grade reading level
 */
const ERROR_MESSAGES = {
  'no-custody':
    'Please tell us about your custody arrangement for this child before setting up monitoring.',
  'no-child': 'Please select a child to set up monitoring.',
} as const

/**
 * Validate if monitoring can be started for a child
 *
 * This is the client-side component of the monitoring gate.
 * Server-side enforcement happens in Firestore security rules.
 *
 * @param child - The child profile to validate, or null if no child selected
 * @returns MonitoringGateResult with validation status and user-friendly messaging
 *
 * @example
 * ```tsx
 * const result = validateMonitoringGate(selectedChild)
 * if (!result.canProceed) {
 *   toast.error(result.message)
 *   if (result.redirectUrl) {
 *     router.push(result.redirectUrl)
 *   }
 *   return
 * }
 * // Proceed with device enrollment...
 * ```
 */
export function validateMonitoringGate(child: ChildProfile | null): MonitoringGateResult {
  // Case 1: No child selected
  if (!child) {
    return {
      canProceed: false,
      message: ERROR_MESSAGES['no-child'],
      redirectUrl: '/dashboard',
      blockingReason: 'no-child',
    }
  }

  // Case 2: Child has no custody declaration
  if (!canStartMonitoring(child)) {
    return {
      canProceed: false,
      message: ERROR_MESSAGES['no-custody'],
      redirectUrl: `/children/${child.id}/custody`,
      blockingReason: 'no-custody',
    }
  }

  // Case 3: All checks pass - monitoring can proceed
  return {
    canProceed: true,
    message: null,
    redirectUrl: null,
    blockingReason: null,
  }
}

/**
 * Get the custody declaration URL for a child
 *
 * Use this to redirect users to declare custody before monitoring.
 *
 * @param childId - The child's ID
 * @returns URL to the custody declaration page
 */
export function getCustodyDeclarationUrl(childId: string): string {
  return `/children/${childId}/custody`
}

/**
 * Check if a child can have monitoring enabled
 *
 * Convenience re-export of the contracts helper for use in components.
 *
 * @param child - The child profile to check
 * @returns true if the child has a custody declaration
 */
export { canStartMonitoring } from '@fledgely/contracts'
