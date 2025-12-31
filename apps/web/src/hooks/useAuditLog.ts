/**
 * useAuditLog Hook
 *
 * Story 27.2: Parent Audit Log View - AC1, AC4, AC6
 *
 * Provides audit log data fetching with:
 * - Pagination support (infinite scroll)
 * - Filter state management
 * - Loading and error states
 * - Family member list for filter dropdown
 */

import { useState, useCallback, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { getAuth } from 'firebase/auth'
import type { AuditResourceType } from '@fledgely/shared'

/**
 * Audit event from API response
 */
export interface AuditLogEvent {
  id: string
  actorUid: string
  actorDisplayName: string
  actorType: string
  accessType: string
  resourceType: string
  resourceId: string | null
  childId: string | null
  timestamp: number
  deviceId: string | null
  userAgent: string | null
}

/**
 * Family member for filter dropdown
 */
export interface FamilyMember {
  uid: string
  displayName: string
  role: string
}

/**
 * Filter options for audit log
 */
export interface AuditLogFilters {
  actorUid?: string
  resourceType?: AuditResourceType
  startDate?: Date
  endDate?: Date
}

/**
 * Audit log hook state
 */
export interface UseAuditLogState {
  events: AuditLogEvent[]
  isLoading: boolean
  isLoadingMore: boolean
  error: string | null
  hasMore: boolean
  onlyFamilyAccess: boolean
  familyMembers: FamilyMember[]
  filters: AuditLogFilters
  setFilters: (filters: AuditLogFilters) => void
  loadMore: () => Promise<void>
  refresh: () => Promise<void>
}

/**
 * API base URL for functions
 */
const FUNCTIONS_URL = process.env.NEXT_PUBLIC_FUNCTIONS_URL || ''

/**
 * Fetch audit log from API
 */
async function fetchAuditLog(
  familyId: string,
  token: string,
  filters: AuditLogFilters,
  cursor?: number
): Promise<{
  events: AuditLogEvent[]
  hasMore: boolean
  nextCursor: number | null
  onlyFamilyAccess: boolean
  familyMembers: FamilyMember[]
}> {
  const params = new URLSearchParams({ familyId })

  if (filters.actorUid) {
    params.append('actorUid', filters.actorUid)
  }

  if (filters.resourceType) {
    params.append('resourceType', filters.resourceType)
  }

  if (filters.startDate) {
    params.append('startDate', filters.startDate.getTime().toString())
  }

  if (filters.endDate) {
    params.append('endDate', filters.endDate.getTime().toString())
  }

  if (cursor) {
    params.append('cursor', cursor.toString())
  }

  const response = await fetch(`${FUNCTIONS_URL}/familyAuditLog?${params.toString()}`, {
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
 * Hook for fetching and managing audit log data
 *
 * @param familyId - Family ID to fetch audit log for
 * @returns Audit log state and actions
 */
export function useAuditLog(familyId: string | null): UseAuditLogState {
  const { firebaseUser } = useAuth()
  const [events, setEvents] = useState<AuditLogEvent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [nextCursor, setNextCursor] = useState<number | null>(null)
  const [onlyFamilyAccess, setOnlyFamilyAccess] = useState(true)
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([])
  const [filters, setFilters] = useState<AuditLogFilters>({})

  /**
   * Load initial audit log data
   */
  const loadInitial = useCallback(async () => {
    if (!familyId || !firebaseUser) {
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

      const result = await fetchAuditLog(familyId, token, filters)

      setEvents(result.events)
      setHasMore(result.hasMore)
      setNextCursor(result.nextCursor)
      setOnlyFamilyAccess(result.onlyFamilyAccess)
      setFamilyMembers(result.familyMembers)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }, [familyId, firebaseUser, filters])

  /**
   * Load more events (pagination)
   */
  const loadMore = useCallback(async () => {
    if (!familyId || !firebaseUser || !hasMore || !nextCursor || isLoadingMore) {
      return
    }

    setIsLoadingMore(true)

    try {
      const auth = getAuth()
      const token = await auth.currentUser?.getIdToken()

      if (!token) {
        throw new Error('Not authenticated')
      }

      const result = await fetchAuditLog(familyId, token, filters, nextCursor)

      setEvents((prev) => [...prev, ...result.events])
      setHasMore(result.hasMore)
      setNextCursor(result.nextCursor)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoadingMore(false)
    }
  }, [familyId, firebaseUser, hasMore, nextCursor, isLoadingMore, filters])

  /**
   * Refresh audit log data
   */
  const refresh = useCallback(async () => {
    setNextCursor(null)
    await loadInitial()
  }, [loadInitial])

  // Load initial data when familyId or filters change
  useEffect(() => {
    loadInitial()
  }, [loadInitial])

  return {
    events,
    isLoading,
    isLoadingMore,
    error,
    hasMore,
    onlyFamilyAccess,
    familyMembers,
    filters,
    setFilters,
    loadMore,
    refresh,
  }
}
