/**
 * useChildLocationStatus Hook - Story 40.5
 *
 * React hook for managing child location status and history.
 *
 * Acceptance Criteria:
 * - AC2: Current Location Status Display
 * - AC3: Location History Access
 * - AC6: Request Disable Feature
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { getFunctions, httpsCallable } from 'firebase/functions'
import type {
  ChildLocationStatus,
  GetChildLocationHistoryResponse,
  ChildLocationHistoryItem,
} from '@fledgely/shared'

export interface UseChildLocationStatusOptions {
  /** Family ID */
  familyId: string
  /** Child ID */
  childId: string
  /** Whether to enable real-time updates */
  enableRealtime?: boolean
}

export interface UseChildLocationStatusResult {
  /** Current location status */
  status: ChildLocationStatus | null
  /** Status message for display */
  statusMessage: string | null
  /** Location history */
  history: ChildLocationHistoryItem[]
  /** Total history count */
  historyTotalCount: number
  /** Whether there are more history pages */
  historyHasMore: boolean
  /** Current history page */
  historyPage: number
  /** Loading state for status */
  isStatusLoading: boolean
  /** Loading state for history */
  isHistoryLoading: boolean
  /** Loading state for request submission */
  isSubmitting: boolean
  /** Error message */
  error: string | null
  /** Refresh status */
  refreshStatus: () => Promise<void>
  /** Load history (initial or next page) */
  loadHistory: (page?: number) => Promise<void>
  /** Submit disable request */
  requestDisable: (reason?: string) => Promise<{ requestId: string } | null>
}

export function useChildLocationStatus({
  familyId,
  childId,
  enableRealtime = false,
}: UseChildLocationStatusOptions): UseChildLocationStatusResult {
  const [status, setStatus] = useState<ChildLocationStatus | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [history, setHistory] = useState<ChildLocationHistoryItem[]>([])
  const [historyTotalCount, setHistoryTotalCount] = useState(0)
  const [historyHasMore, setHistoryHasMore] = useState(false)
  const [historyPage, setHistoryPage] = useState(1)
  const [isStatusLoading, setIsStatusLoading] = useState(true)
  const [isHistoryLoading, setIsHistoryLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const functions = getFunctions()

  // Fetch current location status
  const refreshStatus = useCallback(async () => {
    if (!familyId || !childId) return

    setIsStatusLoading(true)
    setError(null)

    try {
      const getStatus = httpsCallable<
        { familyId: string; childId: string },
        { status: ChildLocationStatus; message: string }
      >(functions, 'getChildLocationStatus')

      const result = await getStatus({ familyId, childId })
      setStatus(result.data.status)
      setStatusMessage(result.data.message)
    } catch (err) {
      console.error('Error fetching location status:', err)
      setError('Could not load your location status')
    } finally {
      setIsStatusLoading(false)
    }
  }, [familyId, childId, functions])

  // Fetch location history
  const loadHistory = useCallback(
    async (page = 1) => {
      if (!familyId || !childId) return

      setIsHistoryLoading(true)
      setError(null)

      try {
        const getHistory = httpsCallable<
          { familyId: string; childId: string; page: number; pageSize: number },
          GetChildLocationHistoryResponse
        >(functions, 'getChildLocationHistory')

        const result = await getHistory({ familyId, childId, page, pageSize: 20 })

        if (page === 1) {
          setHistory(result.data.history)
        } else {
          setHistory((prev) => [...prev, ...result.data.history])
        }

        setHistoryTotalCount(result.data.totalCount)
        setHistoryHasMore(result.data.hasMore)
        setHistoryPage(page)
      } catch (err) {
        console.error('Error fetching location history:', err)
        setError('Could not load your location history')
      } finally {
        setIsHistoryLoading(false)
      }
    },
    [familyId, childId, functions]
  )

  // Submit disable request
  const requestDisable = useCallback(
    async (reason?: string): Promise<{ requestId: string } | null> => {
      if (!familyId) return null

      setIsSubmitting(true)
      setError(null)

      try {
        const submitRequest = httpsCallable<
          { familyId: string; reason?: string },
          { requestId: string; message: string }
        >(functions, 'requestLocationDisable')

        const result = await submitRequest({ familyId, reason })
        return { requestId: result.data.requestId }
      } catch (err) {
        console.error('Error submitting disable request:', err)
        setError('Could not send your request. Please try again.')
        return null
      } finally {
        setIsSubmitting(false)
      }
    },
    [familyId, functions]
  )

  // Initial load
  useEffect(() => {
    refreshStatus()
  }, [refreshStatus])

  // Real-time updates (optional)
  useEffect(() => {
    if (!enableRealtime) return

    // Poll every 60 seconds for status updates
    const interval = setInterval(() => {
      refreshStatus()
    }, 60000)

    return () => clearInterval(interval)
  }, [enableRealtime, refreshStatus])

  return {
    status,
    statusMessage,
    history,
    historyTotalCount,
    historyHasMore,
    historyPage,
    isStatusLoading,
    isHistoryLoading,
    isSubmitting,
    error,
    refreshStatus,
    loadHistory,
    requestDisable,
  }
}

export default useChildLocationStatus
