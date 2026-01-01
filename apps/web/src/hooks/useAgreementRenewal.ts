/**
 * useAgreementRenewal Hook - Story 35.3
 *
 * Hook for managing agreement renewal state and actions.
 * AC1: Mode selection
 * AC4: Child consent required
 * AC5: Both signatures required
 * AC6: New expiry date
 */

import { useState, useMemo, useCallback } from 'react'
import { type RenewalMode, type ExpiryDuration } from '@fledgely/shared'
import {
  initiateRenewal,
  processParentConsent,
  processChildConsent,
  completeRenewal as completeRenewalService,
  cancelRenewal as cancelRenewalService,
  canCompleteRenewal,
  getRenewalModeOptions,
  getNextRenewalStep,
  type RenewalState,
  type RenewalModeOption,
  type RenewalStep,
} from '../services/agreementRenewalService'

export interface UseAgreementRenewalParams {
  /** Agreement ID to renew */
  agreementId: string
  /** Current agreement expiry date */
  currentExpiryDate: Date
  /** Current agreement duration setting */
  currentDuration: ExpiryDuration
  /** Callback when renewal completes */
  onComplete?: (newExpiryDate: Date | null) => void
  /** Callback when renewal is cancelled */
  onCancel?: () => void
}

export interface UseAgreementRenewalResult {
  /** Current renewal state */
  renewalState: RenewalState | null
  /** Whether renewal is in progress */
  isRenewing: boolean
  /** Available mode options */
  modeOptions: RenewalModeOption[]
  /** Current step in the flow */
  currentStep: RenewalStep | null
  /** Whether parent has signed */
  parentSigned: boolean
  /** Whether child has signed */
  childSigned: boolean
  /** Whether renewal can be completed */
  canComplete: boolean
  /** New expiry date (if calculated) */
  newExpiryDate: Date | null
  /** Start the renewal process */
  startRenewal: (mode: RenewalMode) => void
  /** Record parent signature */
  signAsParent: (signature: string) => void
  /** Record child signature */
  signAsChild: (signature: string) => void
  /** Complete the renewal */
  completeRenewal: () => void
  /** Cancel the renewal */
  cancelRenewal: () => void
  /** Reset all state */
  reset: () => void
}

/**
 * Hook for managing agreement renewal state and actions.
 */
export function useAgreementRenewal({
  agreementId,
  currentExpiryDate,
  currentDuration,
  onComplete,
  onCancel,
}: UseAgreementRenewalParams): UseAgreementRenewalResult {
  const [renewalState, setRenewalState] = useState<RenewalState | null>(null)

  // Get mode options
  const modeOptions = useMemo(() => getRenewalModeOptions(), [])

  // Derived state
  const isRenewing = renewalState !== null
  const parentSigned = renewalState?.parentConsent !== null
  const childSigned = renewalState?.childConsent !== null
  const canComplete = renewalState ? canCompleteRenewal(renewalState) : false
  const newExpiryDate = renewalState?.newExpiryDate ?? null

  // Current step
  const currentStep = useMemo(() => {
    if (!renewalState) return null
    return getNextRenewalStep(renewalState)
  }, [renewalState])

  // Start renewal
  const startRenewal = useCallback(
    (mode: RenewalMode) => {
      const renewal = initiateRenewal({
        agreementId,
        mode,
        duration: currentDuration,
        currentExpiryDate,
      })
      setRenewalState(renewal)
    },
    [agreementId, currentDuration, currentExpiryDate]
  )

  // Sign as parent
  const signAsParent = useCallback((signature: string) => {
    setRenewalState((current) => {
      if (!current) return current
      return processParentConsent(current, signature)
    })
  }, [])

  // Sign as child
  const signAsChild = useCallback((signature: string) => {
    setRenewalState((current) => {
      if (!current) return current
      return processChildConsent(current, signature)
    })
  }, [])

  // Complete renewal
  const completeRenewal = useCallback(() => {
    setRenewalState((current) => {
      if (!current) return current
      const completed = completeRenewalService(current)
      if (completed.status === 'completed') {
        onComplete?.(completed.newExpiryDate)
      }
      return completed
    })
  }, [onComplete])

  // Cancel renewal
  const cancelRenewal = useCallback(() => {
    setRenewalState((current) => {
      if (!current) return current
      const cancelled = cancelRenewalService(current)
      if (cancelled.status === 'cancelled') {
        onCancel?.()
      }
      return cancelled
    })
  }, [onCancel])

  // Reset state
  const reset = useCallback(() => {
    setRenewalState(null)
  }, [])

  return {
    renewalState,
    isRenewing,
    modeOptions,
    currentStep,
    parentSigned,
    childSigned,
    canComplete,
    newExpiryDate,
    startRenewal,
    signAsParent,
    signAsChild,
    completeRenewal,
    cancelRenewal,
    reset,
  }
}
