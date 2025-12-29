/**
 * Agreement Mode Hook.
 *
 * Story 5.6: Agreement-Only Mode Selection - AC4, AC5
 *
 * Provides context for the current agreement mode and functions
 * to check mode-specific behavior.
 */

import { useMemo } from 'react'
import type { AgreementMode } from '@fledgely/shared/contracts'

interface UseAgreementModeOptions {
  /** Current agreement mode */
  mode: AgreementMode
}

interface UseAgreementModeReturn {
  /** Current agreement mode */
  mode: AgreementMode
  /** Whether current mode is agreement only (no monitoring) */
  isAgreementOnly: boolean
  /** Whether current mode includes full monitoring */
  isFullMonitoring: boolean
  /** Whether device enrollment should be shown */
  shouldShowEnrollment: boolean
  /** Whether monitoring terms should be available */
  shouldShowMonitoringTerms: boolean
  /** Whether upgrade to monitoring option should be available */
  canUpgradeToMonitoring: boolean
}

/**
 * Hook to access agreement mode state and helpers.
 *
 * @param options Configuration options
 * @returns Mode state and helper functions
 *
 * @example
 * ```tsx
 * const {
 *   isAgreementOnly,
 *   shouldShowEnrollment,
 *   canUpgradeToMonitoring
 * } = useAgreementMode({ mode: 'agreement_only' })
 *
 * // isAgreementOnly = true
 * // shouldShowEnrollment = false
 * // canUpgradeToMonitoring = true
 * ```
 */
export function useAgreementMode(options: UseAgreementModeOptions): UseAgreementModeReturn {
  const { mode } = options

  const isAgreementOnly = useMemo(() => mode === 'agreement_only', [mode])
  const isFullMonitoring = useMemo(() => mode === 'full_monitoring', [mode])

  const shouldShowEnrollment = useMemo(() => {
    // Only show enrollment in full monitoring mode
    return isFullMonitoring
  }, [isFullMonitoring])

  const shouldShowMonitoringTerms = useMemo(() => {
    // Only show monitoring terms in full monitoring mode
    return isFullMonitoring
  }, [isFullMonitoring])

  const canUpgradeToMonitoring = useMemo(() => {
    // Can upgrade when in agreement only mode
    return isAgreementOnly
  }, [isAgreementOnly])

  return {
    mode,
    isAgreementOnly,
    isFullMonitoring,
    shouldShowEnrollment,
    shouldShowMonitoringTerms,
    canUpgradeToMonitoring,
  }
}
