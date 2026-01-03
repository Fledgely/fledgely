'use client'

/**
 * useLocationRules Hook - Story 40.2
 *
 * Manages location-specific rule operations.
 *
 * Acceptance Criteria:
 * - AC2: Per-Location Time Limits
 * - AC3: Per-Location Category Rules
 *
 * Features:
 * - Real-time subscription to location rules
 * - Set and delete operations
 * - Helper to get effective rules for a zone
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { httpsCallable, HttpsCallableResult } from 'firebase/functions'
import { collection, onSnapshot, query, where } from 'firebase/firestore'
import { getFirebaseFunctions, getFirestoreDb } from '../lib/firebase'
import type { LocationRule, CategoryOverrides } from '@fledgely/shared'

/**
 * Rule update input
 */
export interface SetRuleInput {
  zoneId: string
  childId: string
  dailyTimeLimitMinutes?: number | null
  categoryOverrides?: CategoryOverrides
  educationOnlyMode?: boolean
}

/**
 * Response from setLocationRule callable
 */
interface SetRuleResponse {
  success: boolean
  ruleId: string
  message: string
  isNew: boolean
}

/**
 * Response from deleteLocationRule callable
 */
interface DeleteRuleResponse {
  success: boolean
  message: string
}

/**
 * Hook return type
 */
export interface UseLocationRulesReturn {
  // State
  rules: LocationRule[]
  loading: boolean
  actionLoading: boolean
  error: string | null

  // Actions
  setRule: (input: SetRuleInput) => Promise<string | null>
  deleteRule: (ruleId: string) => Promise<boolean>

  // Utilities
  getRuleForZone: (zoneId: string, childId: string) => LocationRule | null
  clearError: () => void
  refreshRules: () => void
}

/**
 * Hook for managing location-specific rules.
 *
 * @param familyId - The family ID to manage location rules for
 * @param childId - Optional child ID to filter rules for a specific child
 * @returns Location rules state and operations
 */
export function useLocationRules(
  familyId: string | null,
  childId?: string | null
): UseLocationRulesReturn {
  const [rules, setRules] = useState<LocationRule[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  // Clear error
  const clearError = useCallback(() => setError(null), [])

  // Force refresh
  const refreshRules = useCallback(() => setRefreshKey((k) => k + 1), [])

  // Subscribe to location rules
  useEffect(() => {
    if (!familyId) {
      setRules([])
      setLoading(false)
      return
    }

    setLoading(true)
    const db = getFirestoreDb()
    const rulesRef = collection(db, 'families', familyId, 'locationRules')

    // Optionally filter by childId
    const rulesQuery = childId ? query(rulesRef, where('childId', '==', childId)) : rulesRef

    const unsubscribe = onSnapshot(
      rulesQuery,
      (snapshot) => {
        const rulesList: LocationRule[] = snapshot.docs.map((doc) => {
          const data = doc.data()
          return {
            id: doc.id,
            zoneId: data.zoneId,
            familyId: data.familyId,
            childId: data.childId,
            dailyTimeLimitMinutes: data.dailyTimeLimitMinutes ?? null,
            categoryOverrides: data.categoryOverrides ?? {},
            educationOnlyMode: data.educationOnlyMode ?? false,
            createdAt: data.createdAt?.toDate() ?? new Date(),
            updatedAt: data.updatedAt?.toDate() ?? new Date(),
          }
        })
        setRules(rulesList)
        setLoading(false)
      },
      (err) => {
        console.error('Error subscribing to location rules:', err)
        setError('Failed to load location rules')
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [familyId, childId, refreshKey])

  /**
   * Get rule for a specific zone and child
   */
  const getRuleForZone = useCallback(
    (zoneId: string, targetChildId: string): LocationRule | null => {
      return rules.find((r) => r.zoneId === zoneId && r.childId === targetChildId) ?? null
    },
    [rules]
  )

  /**
   * Set (create or update) a location rule
   */
  const setRule = useCallback(
    async (input: SetRuleInput): Promise<string | null> => {
      if (!familyId) {
        setError('No family selected')
        return null
      }

      setActionLoading(true)
      setError(null)

      try {
        const functions = getFirebaseFunctions()
        const fn = httpsCallable<
          {
            familyId: string
            zoneId: string
            childId: string
            dailyTimeLimitMinutes?: number | null
            categoryOverrides?: CategoryOverrides
            educationOnlyMode?: boolean
          },
          SetRuleResponse
        >(functions, 'setLocationRule')

        const result: HttpsCallableResult<SetRuleResponse> = await fn({
          familyId,
          ...input,
        })

        if (!result.data.success) {
          setError(result.data.message || 'Failed to set location rule')
          return null
        }

        return result.data.ruleId
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to set location rule'
        setError(message)
        return null
      } finally {
        setActionLoading(false)
      }
    },
    [familyId]
  )

  /**
   * Delete a location rule
   */
  const deleteRule = useCallback(
    async (ruleId: string): Promise<boolean> => {
      if (!familyId) {
        setError('No family selected')
        return false
      }

      setActionLoading(true)
      setError(null)

      try {
        const functions = getFirebaseFunctions()
        const fn = httpsCallable<{ familyId: string; ruleId: string }, DeleteRuleResponse>(
          functions,
          'deleteLocationRule'
        )

        const result: HttpsCallableResult<DeleteRuleResponse> = await fn({
          familyId,
          ruleId,
        })

        if (!result.data.success) {
          setError(result.data.message || 'Failed to delete location rule')
          return false
        }

        return true
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to delete location rule'
        setError(message)
        return false
      } finally {
        setActionLoading(false)
      }
    },
    [familyId]
  )

  return useMemo(
    () => ({
      rules,
      loading,
      actionLoading,
      error,
      setRule,
      deleteRule,
      getRuleForZone,
      clearError,
      refreshRules,
    }),
    [
      rules,
      loading,
      actionLoading,
      error,
      setRule,
      deleteRule,
      getRuleForZone,
      clearError,
      refreshRules,
    ]
  )
}

export default useLocationRules
