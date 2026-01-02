/**
 * useScreenshotViewingRate Hook - Story 3A.5
 *
 * Hook for integrating screenshot viewing rate tracking with UI components.
 * Tracks views, checks thresholds, and triggers alerts when needed.
 *
 * SECURITY: Only one alert per session to prevent spam.
 */

import { useCallback, useMemo, useState } from 'react'
import {
  VIEWING_RATE_CONFIG,
  trackScreenshotView,
  checkThresholdExceeded,
  sendViewingRateAlert,
  hasAlertBeenSentThisSession,
  markAlertSentThisSession,
  getViewingRate,
  type RateCheckResult,
} from '../services/screenshotViewingRateService'

/**
 * Hook result for screenshot viewing rate tracking.
 */
export interface UseScreenshotViewingRateResult {
  /** Track a screenshot view and check threshold */
  recordView: (screenshotId?: string) => Promise<void>
  /** Current viewing rate (count in window) */
  currentRate: number
  /** Whether threshold is currently exceeded */
  isThresholdExceeded: boolean
  /** Whether alert has already been sent this session */
  alertSentThisSession: boolean
  /** Rate configuration (readonly) */
  config: typeof VIEWING_RATE_CONFIG
  /** Error if alert sending failed */
  alertError: string | null
  /** Whether alert is currently being sent */
  isSendingAlert: boolean
}

/**
 * Hook for tracking screenshot viewing rates.
 *
 * @param familyId - The family ID
 * @param viewerUid - The UID of the user viewing screenshots
 * @returns Hook result with rate tracking functions and state
 */
export function useScreenshotViewingRate(
  familyId: string,
  viewerUid: string
): UseScreenshotViewingRateResult {
  const [alertSentThisSession, setAlertSentThisSession] = useState<boolean>(() =>
    hasAlertBeenSentThisSession(viewerUid)
  )
  const [alertError, setAlertError] = useState<string | null>(null)
  const [isSendingAlert, setIsSendingAlert] = useState(false)
  const [lastRateCheck, setLastRateCheck] = useState<RateCheckResult>(() =>
    checkThresholdExceeded(viewerUid)
  )

  /**
   * Record a screenshot view and check if threshold is exceeded.
   * If exceeded and not already alerted, sends alert to co-parents.
   */
  const recordView = useCallback(
    async (screenshotId?: string): Promise<void> => {
      // Track the view
      trackScreenshotView(viewerUid, screenshotId)

      // Check threshold
      const rateCheck = checkThresholdExceeded(viewerUid)
      setLastRateCheck(rateCheck)

      // If threshold exceeded and we haven't sent an alert this session
      if (rateCheck.exceeded && !hasAlertBeenSentThisSession(viewerUid)) {
        setIsSendingAlert(true)
        setAlertError(null)

        try {
          await sendViewingRateAlert({
            familyId,
            viewerUid,
            viewCount: rateCheck.count,
            timeframeStart: rateCheck.windowStart,
            timeframeEnd: rateCheck.windowEnd,
          })

          // Mark alert as sent for this session
          markAlertSentThisSession(viewerUid)
          setAlertSentThisSession(true)
        } catch (error) {
          // Log error but don't interrupt viewing (Story 3A.5 AC3: non-blocking)
          const errorMessage = error instanceof Error ? error.message : 'Failed to send alert'
          setAlertError(errorMessage)
          console.error('[useScreenshotViewingRate] Alert send failed:', errorMessage)
        } finally {
          setIsSendingAlert(false)
        }
      }
    },
    [familyId, viewerUid]
  )

  /**
   * Get current viewing rate (memoized).
   */
  const currentRate = useMemo(() => {
    return getViewingRate(viewerUid)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewerUid, lastRateCheck.count])

  /**
   * Check if threshold is currently exceeded (memoized).
   */
  const isThresholdExceeded = useMemo(() => {
    return lastRateCheck.exceeded
  }, [lastRateCheck])

  return {
    recordView,
    currentRate,
    isThresholdExceeded,
    alertSentThisSession,
    config: VIEWING_RATE_CONFIG,
    alertError,
    isSendingAlert,
  }
}
