/**
 * useLocationAbuseAlerts Hook
 *
 * Story 40.6: Location Feature Abuse Prevention
 * - AC4: Bilateral parent alerts
 * - AC5: Conflict resolution resources
 *
 * React hook for managing location abuse alerts.
 */

import { useState, useEffect, useCallback } from 'react'
import { getFunctions, httpsCallable } from 'firebase/functions'
import type { LocationAbusePatternType } from '@fledgely/shared'

export interface LocationAbuseAlertData {
  id: string
  familyId: string
  patternId: string
  patternType: LocationAbusePatternType
  sentAt: Date
  acknowledged: boolean
  acknowledgedAt: Date | null
  resourcesViewed: boolean
  resourcesViewedAt: Date | null
}

export interface UseLocationAbuseAlertsOptions {
  /** Family ID to get alerts for */
  familyId: string
  /** Whether to enable real-time updates */
  enableRealtime?: boolean
}

export interface UseLocationAbuseAlertsResult {
  /** List of alerts */
  alerts: LocationAbuseAlertData[]
  /** Number of unacknowledged alerts */
  unacknowledgedCount: number
  /** Whether alerts are loading */
  isLoading: boolean
  /** Whether an action is in progress */
  isSubmitting: boolean
  /** Error message if any */
  error: string | null
  /** Acknowledge an alert */
  acknowledgeAlert: (alertId: string) => Promise<void>
  /** Mark resources as viewed for an alert */
  markResourcesViewed: (alertId: string) => Promise<void>
  /** Refresh alerts */
  refresh: () => Promise<void>
}

/**
 * Hook for managing location abuse alerts.
 *
 * Provides access to alerts, acknowledgment, and resource tracking.
 */
export function useLocationAbuseAlerts({
  familyId,
  enableRealtime: _enableRealtime = false,
}: UseLocationAbuseAlertsOptions): UseLocationAbuseAlertsResult {
  const [alerts, setAlerts] = useState<LocationAbuseAlertData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Calculate unacknowledged count
  const unacknowledgedCount = alerts.filter((a) => !a.acknowledged).length

  // Load alerts
  const loadAlerts = useCallback(async () => {
    if (!familyId) {
      setAlerts([])
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      const functions = getFunctions()
      const getAlerts = httpsCallable<{ familyId: string }, { alerts: LocationAbuseAlertData[] }>(
        functions,
        'getLocationAbuseAlerts'
      )

      const result = await getAlerts({ familyId })

      // Convert date strings to Date objects
      const alertsWithDates = result.data.alerts.map((alert) => ({
        ...alert,
        sentAt: new Date(alert.sentAt),
        acknowledgedAt: alert.acknowledgedAt ? new Date(alert.acknowledgedAt) : null,
        resourcesViewedAt: alert.resourcesViewedAt ? new Date(alert.resourcesViewedAt) : null,
      }))

      setAlerts(alertsWithDates)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load alerts')
    } finally {
      setIsLoading(false)
    }
  }, [familyId])

  // Initial load
  useEffect(() => {
    loadAlerts()
  }, [loadAlerts])

  // Acknowledge alert
  const acknowledgeAlert = useCallback(
    async (alertId: string) => {
      if (!familyId) return

      try {
        setIsSubmitting(true)
        setError(null)

        const functions = getFunctions()
        const acknowledge = httpsCallable<
          { familyId: string; alertId: string },
          { success: boolean }
        >(functions, 'acknowledgeLocationAbuseAlert')

        await acknowledge({ familyId, alertId })

        // Update local state
        setAlerts((prev) =>
          prev.map((alert) =>
            alert.id === alertId
              ? { ...alert, acknowledged: true, acknowledgedAt: new Date() }
              : alert
          )
        )
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to acknowledge alert')
      } finally {
        setIsSubmitting(false)
      }
    },
    [familyId]
  )

  // Mark resources viewed
  const markResourcesViewed = useCallback(
    async (alertId: string) => {
      if (!familyId) return

      try {
        setIsSubmitting(true)
        setError(null)

        const functions = getFunctions()
        const markViewed = httpsCallable<
          { familyId: string; alertId: string },
          { success: boolean }
        >(functions, 'markResourcesViewed')

        await markViewed({ familyId, alertId })

        // Update local state
        setAlerts((prev) =>
          prev.map((alert) =>
            alert.id === alertId
              ? { ...alert, resourcesViewed: true, resourcesViewedAt: new Date() }
              : alert
          )
        )
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to mark resources viewed')
      } finally {
        setIsSubmitting(false)
      }
    },
    [familyId]
  )

  return {
    alerts,
    unacknowledgedCount,
    isLoading,
    isSubmitting,
    error,
    acknowledgeAlert,
    markResourcesViewed,
    refresh: loadAlerts,
  }
}
