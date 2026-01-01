/**
 * useWorkModeConfig Hook - Story 33.3
 *
 * Manages work mode configuration for parents.
 * Allows setting work schedules and customizing work app whitelist.
 */

import { useState, useEffect, useCallback } from 'react'
import { doc, onSnapshot, setDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore'
import { getFirestoreDb } from '../lib/firebase'
import type { WorkModeConfig, WorkSchedule, WorkModeAppEntry } from '@fledgely/shared'
import { WORK_MODE_DEFAULT_APPS } from '@fledgely/shared'

interface UseWorkModeConfigOptions {
  childId: string | null
  familyId: string | null
  parentUid: string | null
}

interface UseWorkModeConfigReturn {
  config: WorkModeConfig | null
  loading: boolean
  error: string | null
  // Schedule actions
  addSchedule: (schedule: Omit<WorkSchedule, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>
  updateSchedule: (scheduleId: string, updates: Partial<WorkSchedule>) => Promise<void>
  removeSchedule: (scheduleId: string) => Promise<void>
  toggleScheduleEnabled: (scheduleId: string) => Promise<void>
  // Work app actions
  addWorkApp: (pattern: string, name: string) => Promise<void>
  removeWorkApp: (pattern: string) => Promise<void>
  // Config actions
  toggleDefaultWorkApps: (enabled: boolean) => Promise<void>
  togglePauseScreenshots: (enabled: boolean) => Promise<void>
  toggleSuspendTimeLimits: (enabled: boolean) => Promise<void>
  toggleAllowManualActivation: (enabled: boolean) => Promise<void>
  // Computed values
  effectiveWorkApps: { pattern: string; name: string; isDefault: boolean }[]
}

const DEFAULT_CONFIG: Omit<WorkModeConfig, 'childId' | 'familyId'> = {
  schedules: [],
  useDefaultWorkApps: true,
  customWorkApps: [],
  pauseScreenshots: true,
  suspendTimeLimits: true,
  allowManualActivation: true,
  createdAt: Date.now(),
  updatedAt: Date.now(),
}

/**
 * Generate unique schedule ID
 */
function generateScheduleId(): string {
  return `schedule-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Get all default work apps from all categories
 */
function getDefaultWorkApps(): { pattern: string; name: string }[] {
  const apps: { pattern: string; name: string }[] = []
  for (const category of Object.values(WORK_MODE_DEFAULT_APPS)) {
    apps.push(...category)
  }
  return apps
}

export function useWorkModeConfig({
  childId,
  familyId,
  parentUid,
}: UseWorkModeConfigOptions): UseWorkModeConfigReturn {
  const [config, setConfig] = useState<WorkModeConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Subscribe to work mode config
  useEffect(() => {
    if (!childId || !familyId) {
      setLoading(false)
      return
    }

    const configRef = doc(getFirestoreDb(), 'families', familyId, 'workModeConfig', childId)

    const unsubscribe = onSnapshot(
      configRef,
      (snapshot) => {
        if (snapshot.exists()) {
          setConfig(snapshot.data() as WorkModeConfig)
        } else {
          // Initialize config if it doesn't exist
          const initialConfig: WorkModeConfig = {
            ...DEFAULT_CONFIG,
            childId,
            familyId,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          }
          setDoc(configRef, initialConfig)
          setConfig(initialConfig)
        }
        setLoading(false)
      },
      (err) => {
        console.error('[useWorkModeConfig] Error:', err)
        setError('Failed to load work mode configuration')
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [childId, familyId])

  // Add a new work schedule
  const addSchedule = useCallback(
    async (schedule: Omit<WorkSchedule, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
      if (!childId || !familyId) return ''

      const configRef = doc(getFirestoreDb(), 'families', familyId, 'workModeConfig', childId)
      const now = Date.now()
      const scheduleId = generateScheduleId()

      const newSchedule: WorkSchedule = {
        ...schedule,
        id: scheduleId,
        createdAt: now,
        updatedAt: now,
      }

      await updateDoc(configRef, {
        schedules: arrayUnion(newSchedule),
        updatedAt: now,
      }).catch(async () => {
        // Config doesn't exist, create it
        await setDoc(configRef, {
          childId,
          familyId,
          schedules: [newSchedule],
          useDefaultWorkApps: true,
          customWorkApps: [],
          pauseScreenshots: true,
          suspendTimeLimits: true,
          allowManualActivation: true,
          createdAt: now,
          updatedAt: now,
        })
      })

      return scheduleId
    },
    [childId, familyId]
  )

  // Update an existing schedule
  const updateSchedule = useCallback(
    async (scheduleId: string, updates: Partial<WorkSchedule>) => {
      if (!childId || !familyId || !config) return

      const configRef = doc(getFirestoreDb(), 'families', familyId, 'workModeConfig', childId)
      const now = Date.now()

      // Find and update the schedule
      const updatedSchedules = config.schedules.map((s) =>
        s.id === scheduleId ? { ...s, ...updates, updatedAt: now } : s
      )

      await updateDoc(configRef, {
        schedules: updatedSchedules,
        updatedAt: now,
      })
    },
    [childId, familyId, config]
  )

  // Remove a schedule
  const removeSchedule = useCallback(
    async (scheduleId: string) => {
      if (!childId || !familyId || !config) return

      const configRef = doc(getFirestoreDb(), 'families', familyId, 'workModeConfig', childId)
      const scheduleToRemove = config.schedules.find((s) => s.id === scheduleId)

      if (scheduleToRemove) {
        await updateDoc(configRef, {
          schedules: arrayRemove(scheduleToRemove),
          updatedAt: Date.now(),
        })
      }
    },
    [childId, familyId, config]
  )

  // Toggle schedule enabled/disabled
  const toggleScheduleEnabled = useCallback(
    async (scheduleId: string) => {
      if (!childId || !familyId || !config) return

      const schedule = config.schedules.find((s) => s.id === scheduleId)
      if (schedule) {
        await updateSchedule(scheduleId, { isEnabled: !schedule.isEnabled })
      }
    },
    [childId, familyId, config, updateSchedule]
  )

  // Add work app to whitelist
  const addWorkApp = useCallback(
    async (pattern: string, name: string) => {
      if (!childId || !familyId || !parentUid) return

      const configRef = doc(getFirestoreDb(), 'families', familyId, 'workModeConfig', childId)
      const entry: WorkModeAppEntry = {
        pattern,
        name,
        isWildcard: pattern.startsWith('*.'),
        addedAt: Date.now(),
        addedByUid: parentUid,
      }

      await updateDoc(configRef, {
        customWorkApps: arrayUnion(entry),
        updatedAt: Date.now(),
      })
    },
    [childId, familyId, parentUid]
  )

  // Remove work app from whitelist
  const removeWorkApp = useCallback(
    async (pattern: string) => {
      if (!childId || !familyId || !config) return

      const configRef = doc(getFirestoreDb(), 'families', familyId, 'workModeConfig', childId)
      const entryToRemove = config.customWorkApps.find((e) => e.pattern === pattern)

      if (entryToRemove) {
        await updateDoc(configRef, {
          customWorkApps: arrayRemove(entryToRemove),
          updatedAt: Date.now(),
        })
      }
    },
    [childId, familyId, config]
  )

  // Toggle default work apps
  const toggleDefaultWorkApps = useCallback(
    async (enabled: boolean) => {
      if (!childId || !familyId) return

      const configRef = doc(getFirestoreDb(), 'families', familyId, 'workModeConfig', childId)

      await updateDoc(configRef, {
        useDefaultWorkApps: enabled,
        updatedAt: Date.now(),
      })
    },
    [childId, familyId]
  )

  // Toggle pause screenshots during work mode
  const togglePauseScreenshots = useCallback(
    async (enabled: boolean) => {
      if (!childId || !familyId) return

      const configRef = doc(getFirestoreDb(), 'families', familyId, 'workModeConfig', childId)

      await updateDoc(configRef, {
        pauseScreenshots: enabled,
        updatedAt: Date.now(),
      })
    },
    [childId, familyId]
  )

  // Toggle suspend time limits during work mode
  const toggleSuspendTimeLimits = useCallback(
    async (enabled: boolean) => {
      if (!childId || !familyId) return

      const configRef = doc(getFirestoreDb(), 'families', familyId, 'workModeConfig', childId)

      await updateDoc(configRef, {
        suspendTimeLimits: enabled,
        updatedAt: Date.now(),
      })
    },
    [childId, familyId]
  )

  // Toggle allow manual activation
  const toggleAllowManualActivation = useCallback(
    async (enabled: boolean) => {
      if (!childId || !familyId) return

      const configRef = doc(getFirestoreDb(), 'families', familyId, 'workModeConfig', childId)

      await updateDoc(configRef, {
        allowManualActivation: enabled,
        updatedAt: Date.now(),
      })
    },
    [childId, familyId]
  )

  // Compute effective work apps list
  const effectiveWorkApps = useCallback(() => {
    if (!config) return []

    const apps: { pattern: string; name: string; isDefault: boolean }[] = []

    // Add default apps if enabled
    if (config.useDefaultWorkApps) {
      const defaultApps = getDefaultWorkApps()
      apps.push(...defaultApps.map((app) => ({ ...app, isDefault: true })))
    }

    // Add custom apps
    apps.push(...config.customWorkApps.map((app) => ({ ...app, isDefault: false })))

    // Remove duplicates by pattern
    const seen = new Set<string>()
    return apps.filter((app) => {
      if (seen.has(app.pattern)) return false
      seen.add(app.pattern)
      return true
    })
  }, [config])

  return {
    config,
    loading,
    error,
    addSchedule,
    updateSchedule,
    removeSchedule,
    toggleScheduleEnabled,
    addWorkApp,
    removeWorkApp,
    toggleDefaultWorkApps,
    togglePauseScreenshots,
    toggleSuspendTimeLimits,
    toggleAllowManualActivation,
    effectiveWorkApps: effectiveWorkApps(),
  }
}
