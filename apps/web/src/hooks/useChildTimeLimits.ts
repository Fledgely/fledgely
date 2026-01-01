'use client'

/**
 * useChildTimeLimits Hook - Story 30.2, 30.3, 30.5
 *
 * Real-time listener for child time limits configuration.
 * Provides methods to read and update time limits.
 *
 * Requirements:
 * - AC5: Limit applies across all enrolled devices combined
 * - AC6: Changes require child acknowledgment
 * - Story 30.3: Per-category limits
 * - Story 30.5: Per-device limits
 */

import { useState, useEffect, useCallback } from 'react'
import { doc, onSnapshot, setDoc, getDoc } from 'firebase/firestore'
import { getFirestoreDb } from '../lib/firebase'
import type {
  TimeLimitSchedule,
  ChildTimeLimits,
  CategoryLimit,
  DeviceLimit,
} from '@fledgely/shared'

/**
 * Simplified time limits for UI
 */
export interface TimeLimitsConfig {
  weekdayMinutes: number
  weekendMinutes: number
  scheduleType: 'weekdays' | 'school_days'
  unlimited: boolean
}

/**
 * Category limit for UI (Story 30.3)
 */
export interface CategoryLimitConfig {
  categoryId: string
  categoryName: string
  enabled: boolean
  weekdayMinutes: number
  weekendMinutes: number
  unlimited: boolean
}

/**
 * Device limit for UI (Story 30.5)
 */
export interface DeviceLimitConfig {
  deviceId: string
  deviceName: string
  deviceType: 'chromebook' | 'android_phone' | 'android_tablet'
  enabled: boolean
  weekdayMinutes: number
  weekendMinutes: number
  unlimited: boolean
}

interface UseChildTimeLimitsOptions {
  familyId: string | null
  childId: string | null
  enabled?: boolean
}

interface UseChildTimeLimitsResult {
  limits: TimeLimitsConfig | null
  categoryLimits: CategoryLimitConfig[]
  deviceLimits: DeviceLimitConfig[]
  loading: boolean
  error: string | null
  saveLimits: (config: TimeLimitsConfig) => Promise<{ success: boolean; error?: string }>
  saveCategoryLimits: (
    categories: CategoryLimitConfig[]
  ) => Promise<{ success: boolean; error?: string }>
  saveDeviceLimits: (devices: DeviceLimitConfig[]) => Promise<{ success: boolean; error?: string }>
  hasChanges: boolean
}

const DEFAULT_LIMITS: TimeLimitsConfig = {
  weekdayMinutes: 120, // 2 hours
  weekendMinutes: 180, // 3 hours
  scheduleType: 'weekdays',
  unlimited: false,
}

/**
 * Map Firestore device type to UI-friendly device type.
 * The shared schema supports many device types, but UI only displays 3.
 */
function mapDeviceTypeFromFirestore(
  firestoreType: string | undefined
): DeviceLimitConfig['deviceType'] {
  switch (firestoreType) {
    case 'chromebook':
      return 'chromebook'
    case 'android_phone':
      return 'android_phone'
    case 'android_tablet':
      return 'android_tablet'
    case 'android':
      // Default android to phone
      return 'android_phone'
    default:
      // For unsupported types, default to android_phone
      return 'android_phone'
  }
}

/**
 * Map UI device type back to Firestore-compatible type.
 */
function mapDeviceTypeToFirestore(
  uiType: DeviceLimitConfig['deviceType']
): 'chromebook' | 'android' {
  switch (uiType) {
    case 'chromebook':
      return 'chromebook'
    case 'android_phone':
    case 'android_tablet':
      return 'android'
  }
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
  const [categoryLimits, setCategoryLimits] = useState<CategoryLimitConfig[]>([])
  const [_originalCategoryLimits, setOriginalCategoryLimits] = useState<CategoryLimitConfig[]>([])
  const [deviceLimits, setDeviceLimits] = useState<DeviceLimitConfig[]>([])
  const [_originalDeviceLimits, setOriginalDeviceLimits] = useState<DeviceLimitConfig[]>([])
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
      setCategoryLimits([])
      setOriginalCategoryLimits([])
      setDeviceLimits([])
      setOriginalDeviceLimits([])
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
          // Load daily total limits
          const config: TimeLimitsConfig = {
            weekdayMinutes: data.dailyTotal?.weekdayMinutes ?? DEFAULT_LIMITS.weekdayMinutes,
            weekendMinutes: data.dailyTotal?.weekendMinutes ?? DEFAULT_LIMITS.weekendMinutes,
            scheduleType:
              data.dailyTotal?.scheduleType === 'school_days' ? 'school_days' : 'weekdays',
            unlimited: data.dailyTotal?.unlimited ?? false,
          }
          setLimits(config)
          setOriginalLimits(config)

          // Load category limits (Story 30.3)
          if (data.categoryLimits && Array.isArray(data.categoryLimits)) {
            const catLimits: CategoryLimitConfig[] = data.categoryLimits.map(
              (cat: CategoryLimit) => ({
                categoryId: cat.category,
                categoryName: cat.category.charAt(0).toUpperCase() + cat.category.slice(1),
                enabled: true,
                weekdayMinutes: cat.schedule.weekdayMinutes ?? 60,
                weekendMinutes: cat.schedule.weekendMinutes ?? 120,
                unlimited: cat.schedule.unlimited ?? false,
              })
            )
            setCategoryLimits(catLimits)
            setOriginalCategoryLimits(catLimits)
          } else {
            setCategoryLimits([])
            setOriginalCategoryLimits([])
          }

          // Load device limits (Story 30.5)
          if (data.deviceLimits && Array.isArray(data.deviceLimits)) {
            const devLimits: DeviceLimitConfig[] = data.deviceLimits.map((dev: DeviceLimit) => ({
              deviceId: dev.deviceId,
              deviceName: dev.deviceName,
              deviceType: mapDeviceTypeFromFirestore(dev.deviceType),
              enabled: true,
              weekdayMinutes: dev.schedule.weekdayMinutes ?? 120,
              weekendMinutes: dev.schedule.weekendMinutes ?? 180,
              unlimited: dev.schedule.unlimited ?? false,
            }))
            setDeviceLimits(devLimits)
            setOriginalDeviceLimits(devLimits)
          } else {
            setDeviceLimits([])
            setOriginalDeviceLimits([])
          }
        } else {
          // No limits configured yet - use defaults
          setLimits(DEFAULT_LIMITS)
          setOriginalLimits(DEFAULT_LIMITS)
          setCategoryLimits([])
          setOriginalCategoryLimits([])
          setDeviceLimits([])
          setOriginalDeviceLimits([])
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

  /**
   * Save category limits to Firestore.
   * Story 30.3: Per-category limit configuration.
   */
  const saveCategoryLimits = useCallback(
    async (categories: CategoryLimitConfig[]): Promise<{ success: boolean; error?: string }> => {
      if (!familyId || !childId) {
        return { success: false, error: 'Missing family or child ID' }
      }

      try {
        const db = getFirestoreDb()
        const limitsRef = doc(db, 'families', familyId, 'children', childId, 'timeLimits', 'config')

        // Check if document exists to get current version
        const existingDoc = await getDoc(limitsRef)
        const currentVersion = existingDoc.exists() ? (existingDoc.data()?.version ?? 0) + 1 : 1

        // Convert to Firestore format - only save enabled categories
        const categoryLimitsData: CategoryLimit[] = categories
          .filter((cat) => cat.enabled)
          .map((cat) => ({
            category: cat.categoryId as CategoryLimit['category'],
            schedule: {
              scheduleType: 'weekdays' as const, // Use the same schedule as daily total
              weekdayMinutes: cat.unlimited ? undefined : cat.weekdayMinutes,
              weekendMinutes: cat.unlimited ? undefined : cat.weekendMinutes,
              unlimited: cat.unlimited || undefined,
            },
          }))

        const timeLimitsData: Partial<ChildTimeLimits> = {
          childId,
          familyId,
          categoryLimits: categoryLimitsData,
          updatedAt: Date.now(),
          version: currentVersion,
        }

        await setDoc(limitsRef, timeLimitsData, { merge: true })

        // Update original category limits to match saved state
        setOriginalCategoryLimits(categories)

        return { success: true }
      } catch (err) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Error saving category limits:', err)
        }
        return { success: false, error: 'Failed to save category limits' }
      }
    },
    [familyId, childId]
  )

  /**
   * Save device limits to Firestore.
   * Story 30.5: Per-device limit configuration.
   */
  const saveDeviceLimits = useCallback(
    async (devices: DeviceLimitConfig[]): Promise<{ success: boolean; error?: string }> => {
      if (!familyId || !childId) {
        return { success: false, error: 'Missing family or child ID' }
      }

      try {
        const db = getFirestoreDb()
        const limitsRef = doc(db, 'families', familyId, 'children', childId, 'timeLimits', 'config')

        // Check if document exists to get current version
        const existingDoc = await getDoc(limitsRef)
        const currentVersion = existingDoc.exists() ? (existingDoc.data()?.version ?? 0) + 1 : 1

        // Convert to Firestore format - only save enabled devices
        const deviceLimitsData: DeviceLimit[] = devices
          .filter((dev) => dev.enabled)
          .map((dev) => ({
            deviceId: dev.deviceId,
            deviceName: dev.deviceName,
            deviceType: mapDeviceTypeToFirestore(dev.deviceType),
            schedule: {
              scheduleType: 'weekdays' as const,
              weekdayMinutes: dev.unlimited ? undefined : dev.weekdayMinutes,
              weekendMinutes: dev.unlimited ? undefined : dev.weekendMinutes,
              unlimited: dev.unlimited || undefined,
            },
          }))

        const timeLimitsData: Partial<ChildTimeLimits> = {
          childId,
          familyId,
          deviceLimits: deviceLimitsData,
          updatedAt: Date.now(),
          version: currentVersion,
        }

        await setDoc(limitsRef, timeLimitsData, { merge: true })

        // Update original device limits to match saved state
        setOriginalDeviceLimits(devices)

        return { success: true }
      } catch (err) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Error saving device limits:', err)
        }
        return { success: false, error: 'Failed to save device limits' }
      }
    },
    [familyId, childId]
  )

  return {
    limits,
    categoryLimits,
    deviceLimits,
    loading,
    error,
    saveLimits,
    saveCategoryLimits,
    saveDeviceLimits,
    hasChanges,
  }
}
