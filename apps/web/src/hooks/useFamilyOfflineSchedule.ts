'use client'

/**
 * useFamilyOfflineSchedule Hook - Story 32.1
 *
 * Real-time listener for family offline schedule configuration.
 * Provides methods to read and update offline schedules.
 *
 * Requirements:
 * - AC1: Daily schedule with start and end time
 * - AC2: Different schedules for weekdays vs weekends
 * - AC3: Quick presets available (Dinner time, Bedtime)
 * - AC4: Schedule applies to all family members
 */

import { useState, useEffect, useCallback } from 'react'
import { doc, onSnapshot, setDoc, getDoc } from 'firebase/firestore'
import { getFirestoreDb } from '../lib/firebase'
import type {
  FamilyOfflineSchedule,
  OfflineSchedulePreset,
  OfflineTimeWindow,
} from '@fledgely/shared'
import { OFFLINE_SCHEDULE_PRESETS, familyOfflineScheduleSchema } from '@fledgely/shared'

/**
 * UI-friendly offline schedule configuration
 */
export interface OfflineScheduleConfig {
  enabled: boolean
  preset: OfflineSchedulePreset
  weekdayStart: string // HH:MM
  weekdayEnd: string
  weekendStart: string
  weekendEnd: string
  appliesToParents: boolean
  timezone: string
}

interface UseFamilyOfflineScheduleOptions {
  familyId: string | null | undefined
  enabled?: boolean
}

interface UseFamilyOfflineScheduleResult {
  schedule: OfflineScheduleConfig | null
  loading: boolean
  error: string | null
  saveSchedule: (config: OfflineScheduleConfig) => Promise<{ success: boolean; error?: string }>
  applyPreset: (preset: Exclude<OfflineSchedulePreset, 'custom'>) => OfflineScheduleConfig
  hasChanges: boolean
}

const DEFAULT_SCHEDULE: OfflineScheduleConfig = {
  enabled: false,
  preset: 'custom',
  weekdayStart: '21:00',
  weekdayEnd: '07:00',
  weekendStart: '22:00',
  weekendEnd: '08:00',
  appliesToParents: true,
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
}

/**
 * Get user's local timezone
 */
function getLocalTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone
  } catch {
    return 'UTC'
  }
}

/**
 * Hook to manage family offline schedule.
 *
 * Story 32.1: Family Offline Schedule Configuration
 */
export function useFamilyOfflineSchedule({
  familyId,
  enabled = true,
}: UseFamilyOfflineScheduleOptions): UseFamilyOfflineScheduleResult {
  const [schedule, setSchedule] = useState<OfflineScheduleConfig | null>(null)
  const [originalSchedule, setOriginalSchedule] = useState<OfflineScheduleConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Check if there are unsaved changes
  const hasChanges =
    schedule !== null &&
    originalSchedule !== null &&
    (schedule.enabled !== originalSchedule.enabled ||
      schedule.preset !== originalSchedule.preset ||
      schedule.weekdayStart !== originalSchedule.weekdayStart ||
      schedule.weekdayEnd !== originalSchedule.weekdayEnd ||
      schedule.weekendStart !== originalSchedule.weekendStart ||
      schedule.weekendEnd !== originalSchedule.weekendEnd ||
      schedule.appliesToParents !== originalSchedule.appliesToParents)

  useEffect(() => {
    if (!familyId || !enabled) {
      setSchedule(null)
      setOriginalSchedule(null)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    const db = getFirestoreDb()
    // Document path: /families/{familyId}/settings/offlineSchedule
    const scheduleRef = doc(db, 'families', familyId, 'settings', 'offlineSchedule')

    // Set up real-time listener
    const unsubscribe = onSnapshot(
      scheduleRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data() as FamilyOfflineSchedule
          const config: OfflineScheduleConfig = {
            enabled: data.enabled ?? false,
            preset: data.preset ?? 'custom',
            weekdayStart: data.weekdaySchedule?.startTime ?? '21:00',
            weekdayEnd: data.weekdaySchedule?.endTime ?? '07:00',
            weekendStart: data.weekendSchedule?.startTime ?? '22:00',
            weekendEnd: data.weekendSchedule?.endTime ?? '08:00',
            appliesToParents: data.appliesToParents ?? true,
            timezone: data.weekdaySchedule?.timezone ?? getLocalTimezone(),
          }
          setSchedule(config)
          setOriginalSchedule(config)
        } else {
          // No schedule configured yet - use defaults
          setSchedule(DEFAULT_SCHEDULE)
          setOriginalSchedule(DEFAULT_SCHEDULE)
        }
        setLoading(false)
      },
      (err) => {
        if (process.env.NODE_ENV === 'development') {
          console.error('Error listening to offline schedule:', err)
        }
        setError('Failed to load offline schedule')
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [familyId, enabled])

  /**
   * Apply a preset configuration.
   * AC3: Quick presets available
   */
  const applyPreset = useCallback(
    (preset: Exclude<OfflineSchedulePreset, 'custom'>): OfflineScheduleConfig => {
      const presetConfig = OFFLINE_SCHEDULE_PRESETS[preset]
      const timezone = schedule?.timezone ?? getLocalTimezone()

      return {
        enabled: true,
        preset,
        weekdayStart: presetConfig.weekday.startTime,
        weekdayEnd: presetConfig.weekday.endTime,
        weekendStart: presetConfig.weekend.startTime,
        weekendEnd: presetConfig.weekend.endTime,
        appliesToParents: true,
        timezone,
      }
    },
    [schedule?.timezone]
  )

  /**
   * Save offline schedule to Firestore.
   */
  const saveSchedule = useCallback(
    async (config: OfflineScheduleConfig): Promise<{ success: boolean; error?: string }> => {
      if (!familyId) {
        return { success: false, error: 'Missing family ID' }
      }

      try {
        const db = getFirestoreDb()
        const scheduleRef = doc(db, 'families', familyId, 'settings', 'offlineSchedule')

        const weekdaySchedule: OfflineTimeWindow = {
          startTime: config.weekdayStart,
          endTime: config.weekdayEnd,
          timezone: config.timezone,
        }

        const weekendSchedule: OfflineTimeWindow = {
          startTime: config.weekendStart,
          endTime: config.weekendEnd,
          timezone: config.timezone,
        }

        const now = Date.now()

        // Check if document exists to preserve createdAt
        const existingDoc = await getDoc(scheduleRef)
        const createdAt = existingDoc.exists() ? (existingDoc.data()?.createdAt ?? now) : now

        const scheduleData: FamilyOfflineSchedule = {
          familyId,
          enabled: config.enabled,
          preset: config.preset,
          weekdaySchedule,
          weekendSchedule,
          appliesToParents: config.appliesToParents,
          createdAt,
          updatedAt: now,
        }

        // Validate before saving
        familyOfflineScheduleSchema.parse(scheduleData)

        await setDoc(scheduleRef, scheduleData)

        // Update state to reflect saved changes
        setSchedule(config)
        setOriginalSchedule(config)

        return { success: true }
      } catch (err) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Error saving offline schedule:', err)
        }
        return { success: false, error: 'Failed to save offline schedule' }
      }
    },
    [familyId]
  )

  return {
    schedule,
    loading,
    error,
    saveSchedule,
    applyPreset,
    hasChanges,
  }
}
