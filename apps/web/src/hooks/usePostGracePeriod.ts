/**
 * usePostGracePeriod Hook - Story 35.5
 *
 * Hook for managing post-grace period state.
 * AC1: Monitoring pauses
 * AC3: Time limits no longer enforced
 * AC4: Both parties notified
 * AC5: Can renew at any time
 */

import { useMemo, useCallback } from 'react'
import {
  checkMonitoringStatus,
  getTimeLimitEnforcementStatus,
  getPostGraceNotification,
  canRenewAgreement,
} from '../services/postGracePeriodService'

/**
 * Hook parameters.
 */
export interface UsePostGracePeriodParams {
  agreementId: string
  expiryDate: Date | null
  userRole: 'parent' | 'child'
  onRenew?: (agreementId: string) => void
}

/**
 * Hook result.
 */
export interface UsePostGracePeriodResult {
  isMonitoringPaused: boolean
  areTimeLimitsEnforced: boolean
  canRenew: boolean
  notification: string | null
  renewAgreement: () => void
}

/**
 * Hook for managing post-grace period state.
 */
export function usePostGracePeriod({
  agreementId,
  expiryDate,
  userRole,
  onRenew,
}: UsePostGracePeriodParams): UsePostGracePeriodResult {
  // Build agreement object for service functions
  const agreement = useMemo(
    () => ({
      id: agreementId,
      expiryDate,
      status: 'active',
    }),
    [agreementId, expiryDate]
  )

  // Check monitoring status
  const monitoringStatus = useMemo(() => checkMonitoringStatus(agreement), [agreement])

  const isMonitoringPaused = monitoringStatus === 'paused'

  // Check time limit enforcement
  const timeLimitStatus = useMemo(() => getTimeLimitEnforcementStatus(agreement), [agreement])

  const areTimeLimitsEnforced = timeLimitStatus === 'enforced'

  // Check renewal availability
  const canRenew = useMemo(() => canRenewAgreement(agreement), [agreement])

  // Get notification message
  const notification = useMemo(
    () => getPostGraceNotification(agreement, userRole),
    [agreement, userRole]
  )

  // Renew agreement handler
  const renewAgreement = useCallback(() => {
    onRenew?.(agreementId)
  }, [onRenew, agreementId])

  return {
    isMonitoringPaused,
    areTimeLimitsEnforced,
    canRenew,
    notification,
    renewAgreement,
  }
}
