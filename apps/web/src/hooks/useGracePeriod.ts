/**
 * useGracePeriod Hook - Story 35.4
 *
 * Hook for managing grace period state and UI interactions.
 * AC1: 14-day grace period starts automatically
 * AC3: Banner shown to users
 * AC6: Child sees appropriate message
 */

import { useState, useMemo, useCallback } from 'react'
import {
  getGracePeriodStatusConfig,
  getGracePeriodMessage,
  type GracePeriodUrgency,
} from '@fledgely/shared'
import {
  checkGracePeriodStatus,
  getGracePeriodDaysRemaining,
  shouldShowGracePeriodBanner,
  isMonitoringActive,
} from '../services/gracePeriodService'

/**
 * Hook parameters.
 */
export interface UseGracePeriodParams {
  agreementId: string
  expiryDate: Date | null
  userRole: 'parent' | 'child'
  onRenew?: (agreementId: string) => void
}

/**
 * Hook result.
 */
export interface UseGracePeriodResult {
  isInGracePeriod: boolean
  daysRemaining: number | null
  showBanner: boolean
  bannerMessage: string | null
  bannerDismissed: boolean
  urgency: GracePeriodUrgency | null
  isMonitoringActive: boolean
  dismissBanner: () => void
  renewAgreement: () => void
}

/**
 * Hook for managing grace period state and UI interactions.
 */
export function useGracePeriod({
  agreementId,
  expiryDate,
  userRole,
  onRenew,
}: UseGracePeriodParams): UseGracePeriodResult {
  const [bannerDismissed, setBannerDismissed] = useState(false)

  // Build agreement object for service functions
  const agreement = useMemo(
    () => ({
      id: agreementId,
      expiryDate,
      status: 'active',
    }),
    [agreementId, expiryDate]
  )

  // Calculate grace period status
  const status = useMemo(() => checkGracePeriodStatus(agreement), [agreement])

  const isInGracePeriod = status === 'active'

  // Get days remaining
  const daysRemaining = useMemo(() => getGracePeriodDaysRemaining(agreement), [agreement])

  // Check if banner should show
  const shouldShow = useMemo(() => shouldShowGracePeriodBanner(agreement), [agreement])

  const showBanner = shouldShow && !bannerDismissed

  // Get banner message based on role
  const bannerMessage = useMemo(() => {
    if (!shouldShow) {
      return null
    }
    const days = daysRemaining ?? 0
    return getGracePeriodMessage(days, userRole)
  }, [shouldShow, daysRemaining, userRole])

  // Get urgency level
  const urgency = useMemo(() => {
    if (!shouldShow) {
      return null
    }
    const days = daysRemaining ?? 0
    return getGracePeriodStatusConfig(days).urgency
  }, [shouldShow, daysRemaining])

  // Check if monitoring is active
  const monitoringActive = useMemo(() => isMonitoringActive(agreement), [agreement])

  // Dismiss banner handler
  const dismissBanner = useCallback(() => {
    setBannerDismissed(true)
  }, [])

  // Renew agreement handler
  const renewAgreement = useCallback(() => {
    onRenew?.(agreementId)
  }, [onRenew, agreementId])

  return {
    isInGracePeriod,
    daysRemaining,
    showBanner,
    bannerMessage,
    bannerDismissed,
    urgency,
    isMonitoringActive: monitoringActive,
    dismissBanner,
    renewAgreement,
  }
}
