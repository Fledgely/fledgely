import { useState, useCallback } from 'react'
import type { AgreementMode, CoCreationSession } from '@fledgely/contracts'
import { canUpgradeToMonitoring } from '@fledgely/contracts'

/**
 * Result of an upgrade operation
 */
export interface UpgradeResult {
  success: boolean
  error?: string
  newMode?: AgreementMode
}

/**
 * Props for the useAgreementUpgrade hook
 */
export interface UseAgreementUpgradeProps {
  /** The session to potentially upgrade */
  session?: CoCreationSession | null
  /** Callback to perform the actual upgrade (e.g., API call) */
  performUpgrade?: (sessionId: string) => Promise<UpgradeResult>
  /** Callback when upgrade completes successfully */
  onUpgradeComplete?: (sessionId: string) => void
  /** Callback when upgrade fails */
  onUpgradeError?: (error: string) => void
}

/**
 * Return type for the useAgreementUpgrade hook
 */
export interface UseAgreementUpgradeReturn {
  /** Whether the session can be upgraded */
  canUpgrade: boolean
  /** Whether an upgrade is currently in progress */
  isUpgrading: boolean
  /** Error message if upgrade failed */
  error: string | null
  /** Function to initiate the upgrade */
  upgrade: () => Promise<void>
  /** Function to clear any error state */
  clearError: () => void
  /** Reason why upgrade is not available (if canUpgrade is false) */
  upgradeBlockedReason: string | null
}

/**
 * useAgreementUpgrade Hook
 *
 * Story 5.6: Agreement-Only Mode Selection - Task 6.3
 *
 * Manages the state and logic for upgrading an Agreement Only session
 * to Full monitoring mode. Handles:
 * - Eligibility checking (AC #5)
 * - Loading state during upgrade
 * - Error handling and display
 * - Preserving existing terms
 *
 * @example
 * ```tsx
 * const { canUpgrade, isUpgrading, upgrade, error } = useAgreementUpgrade({
 *   session,
 *   performUpgrade: async (id) => await api.upgradeSession(id),
 *   onUpgradeComplete: (id) => router.push(`/session/${id}`),
 * })
 * ```
 */
export function useAgreementUpgrade({
  session,
  performUpgrade,
  onUpgradeComplete,
  onUpgradeError,
}: UseAgreementUpgradeProps): UseAgreementUpgradeReturn {
  const [isUpgrading, setIsUpgrading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Calculate if upgrade is possible and why not if blocked
  const canUpgrade = session ? canUpgradeToMonitoring(session) : false

  const getUpgradeBlockedReason = useCallback((): string | null => {
    if (!session) {
      return 'No session available'
    }

    if (session.agreementMode === 'full') {
      return 'Session already has full monitoring enabled'
    }

    if (session.status === 'abandoned') {
      return 'Session has been abandoned and cannot be upgraded'
    }

    if (session.status === 'completed') {
      return 'Session is already completed'
    }

    return null
  }, [session])

  const upgradeBlockedReason = canUpgrade ? null : getUpgradeBlockedReason()

  const upgrade = useCallback(async () => {
    if (!session || !canUpgrade || !performUpgrade) {
      return
    }

    setIsUpgrading(true)
    setError(null)

    try {
      const result = await performUpgrade(session.id)

      if (result.success) {
        onUpgradeComplete?.(session.id)
      } else {
        const errorMsg = result.error || 'Failed to upgrade agreement'
        setError(errorMsg)
        onUpgradeError?.(errorMsg)
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'An unexpected error occurred'
      setError(errorMsg)
      onUpgradeError?.(errorMsg)
    } finally {
      setIsUpgrading(false)
    }
  }, [session, canUpgrade, performUpgrade, onUpgradeComplete, onUpgradeError])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return {
    canUpgrade,
    isUpgrading,
    error,
    upgrade,
    clearError,
    upgradeBlockedReason,
  }
}

export default useAgreementUpgrade
