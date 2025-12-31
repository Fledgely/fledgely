/**
 * useChildAuditLog Hook
 *
 * Story 27.3: Child Audit Log View - AC1, AC3
 *
 * Provides child-friendly audit log data fetching with:
 * - Family relationship names (Mom, Dad, etc.)
 * - Friendly message format
 * - Screenshot thumbnails
 * - Loading and error states
 */

import { useState, useCallback, useEffect } from 'react'
import { useChildAuth } from '../contexts/ChildAuthContext'
import { getAuth } from 'firebase/auth'

/**
 * Child-friendly audit event from API
 */
export interface ChildAuditEvent {
  id: string
  actorFamilyName: string
  actorType: string
  accessType: string
  resourceType: string
  resourceId: string | null
  timestamp: number
  friendlyMessage: string
  screenshotThumbnail?: {
    id: string
    timestamp: number
  }
}

/**
 * Child audit log hook state
 */
export interface UseChildAuditLogState {
  events: ChildAuditEvent[]
  isLoading: boolean
  error: string | null
  noRecentAccess: boolean
  lastAccessDate: number | null
  refresh: () => Promise<void>
}

/**
 * API base URL for functions
 */
const FUNCTIONS_URL = process.env.NEXT_PUBLIC_FUNCTIONS_URL || ''

/**
 * Fetch child audit log from API
 */
async function fetchChildAuditLog(
  childId: string,
  familyId: string,
  token: string,
  limit: number = 20
): Promise<{
  events: ChildAuditEvent[]
  noRecentAccess: boolean
  lastAccessDate: number | null
}> {
  const params = new URLSearchParams({
    childId,
    familyId,
    limit: limit.toString(),
  })

  const response = await fetch(`${FUNCTIONS_URL}/childAuditLog?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error || 'Failed to fetch audit log')
  }

  return response.json()
}

/**
 * Hook for fetching child-friendly audit log data
 *
 * @param childId - Child ID to fetch audit log for
 * @param familyId - Family ID for context
 * @returns Child audit log state and actions
 */
export function useChildAuditLog(
  childId: string | null,
  familyId: string | null
): UseChildAuditLogState {
  const { childSession } = useChildAuth()
  const [events, setEvents] = useState<ChildAuditEvent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [noRecentAccess, setNoRecentAccess] = useState(true)
  const [lastAccessDate, setLastAccessDate] = useState<number | null>(null)

  /**
   * Load audit log data
   */
  const loadAuditLog = useCallback(async () => {
    if (!childId || !familyId || !childSession) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const auth = getAuth()
      const token = await auth.currentUser?.getIdToken()

      if (!token) {
        throw new Error('Not authenticated')
      }

      const result = await fetchChildAuditLog(childId, familyId, token)

      setEvents(result.events)
      setNoRecentAccess(result.noRecentAccess)
      setLastAccessDate(result.lastAccessDate)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }, [childId, familyId, childSession])

  /**
   * Refresh audit log data
   */
  const refresh = useCallback(async () => {
    await loadAuditLog()
  }, [loadAuditLog])

  // Load data when IDs change
  useEffect(() => {
    loadAuditLog()
  }, [loadAuditLog])

  return {
    events,
    isLoading,
    error,
    noRecentAccess,
    lastAccessDate,
    refresh,
  }
}
