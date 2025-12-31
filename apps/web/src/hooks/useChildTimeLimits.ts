'use client'

/**
 * useChildTimeLimits Hook - Story 30.2
 *
 * Real-time listener for child time limits configuration.
 * Provides methods to read and update time limits.
 *
 * Requirements:
 * - AC5: Limit applies across all enrolled devices combined
 * - AC6: Changes require child acknowledgment
 */

import { useState, useEffect, useCallback } from 'react'
import { doc, onSnapshot, setDoc, getDoc } from 'firebase/firestore'
import { getFirestoreDb } from '../lib/firebase'
import type { TimeLimitSchedule, ChildTimeLimits } from '@fledgely/shared'

/**
 * Simplified time limits for UI
 */
export interface TimeLimitsConfig {
  weekdayMinutes: number
  weekendMinutes: number
  scheduleType: 'weekdays' | 'school_days'
  unlimited: boolean
}

interface UseChildTimeLimitsOptions {
  familyId: string | null
  childId: string | null
  enabled?: boolean
}

interface UseChildTimeLimitsResult {
  limits: TimeLimitsConfig | null
  loading: boolean
  error: string | null
  saveLimits: (config: TimeLimitsConfig) => Promise<{ success: boolean; error?: string }>
  hasChanges: boolean
}

const DEFAULT_LIMITS: TimeLimitsConfig = {
  weekdayMinutes: 120, // 2 hours
  weekendMinutes: 180, // 3 hours
  scheduleType: 'weekdays',
  unlimited: false,
}

/**
 * Hook to manage child time limits.
 *
 * Task 4: Implement save functionality (AC: #5, #6)
 * - 4.1 Create useChildTimeLimits hook for Firestore operations
 * - 4.2 Save time limit configuration to Firestore
 * - 4.3 Add agreement update notification for child acknowledgment
 */
export function useChildTimeLimits({
  familyId,
  childId,
  enabled = true,
}: UseChildTimeLimitsOptions): UseChildTimeLimitsResult {
  const [limits, setLimits] = useState<TimeLimitsConfig | null>(null)
  const [originalLimits, setOriginalLimits] = useState<TimeLimitsConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Check if there are unsaved changes
  const hasChanges =
    limits !== null &&
    originalLimits !== null &&
    (limits.weekdayMinutes !== originalLimits.weekdayMinutes ||
      limits.weekendMinutes !== originalLimits.weekendMinutes ||
      limits.scheduleType !== originalLimits.scheduleType ||
      limits.unlimited !== originalLimits.unlimited)

  useEffect(() => {
    if (!familyId || !childId || !enabled) {
      setLimits(null)
      setOriginalLimits(null)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    const db = getFirestoreDb()
    // Document path: /families/{familyId}/children/{childId}/timeLimits/config
    const limitsRef = doc(db, 'families', familyId, 'children', childId, 'timeLimits', 'config')

    // Set up real-time listener
    const unsubscribe = onSnapshot(
      limitsRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data() as ChildTimeLimits
          const config: TimeLimitsConfig = {
            weekdayMinutes: data.dailyTotal?.weekdayMinutes ?? DEFAULT_LIMITS.weekdayMinutes,
            weekendMinutes: data.dailyTotal?.weekendMinutes ?? DEFAULT_LIMITS.weekendMinutes,
            scheduleType:
              data.dailyTotal?.scheduleType === 'school_days' ? 'school_days' : 'weekdays',
            unlimited: data.dailyTotal?.unlimited ?? false,
          }
          setLimits(config)
          setOriginalLimits(config)
        } else {
          // No limits configured yet - use defaults
          setLimits(DEFAULT_LIMITS)
          setOriginalLimits(DEFAULT_LIMITS)
        }
        setLoading(false)
      },
      (err) => {
        if (process.env.NODE_ENV === 'development') {
          console.error('Error listening to time limits:', err)
        }
        setError('Failed to load time limits')
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [familyId, childId, enabled])

  /**
   * Save time limits to Firestore.
   * AC6: Changes will trigger agreement update notification.
   */
  const saveLimits = useCallback(
    async (config: TimeLimitsConfig): Promise<{ success: boolean; error?: string }> => {
      if (!familyId || !childId) {
        return { success: false, error: 'Missing family or child ID' }
      }

      try {
        const db = getFirestoreDb()
        const limitsRef = doc(db, 'families', familyId, 'children', childId, 'timeLimits', 'config')

        // Check if document exists to get current version
        const existingDoc = await getDoc(limitsRef)
        const currentVersion = existingDoc.exists() ? (existingDoc.data()?.version ?? 0) + 1 : 1

        const dailyTotal: TimeLimitSchedule = {
          scheduleType: config.scheduleType,
          weekdayMinutes: config.unlimited ? undefined : config.weekdayMinutes,
          weekendMinutes: config.unlimited ? undefined : config.weekendMinutes,
          unlimited: config.unlimited || undefined,
        }

        const timeLimitsData: Partial<ChildTimeLimits> = {
          childId,
          familyId,
          dailyTotal,
          updatedAt: Date.now(),
          version: currentVersion,
        }

        await setDoc(limitsRef, timeLimitsData, { merge: true })

        // Update original limits to match saved state
        setOriginalLimits(config)

        // TODO: AC6 - Trigger agreement update notification
        // This will be implemented when agreement update workflow is built

        return { success: true }
      } catch (err) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Error saving time limits:', err)
        }
        return { success: false, error: 'Failed to save time limits' }
      }
    },
    [familyId, childId]
  )

  return {
    limits,
    loading,
    error,
    saveLimits,
    hasChanges,
  }
}
