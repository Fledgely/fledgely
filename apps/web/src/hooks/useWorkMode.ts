/**
 * useWorkMode Hook - Story 33.3
 *
 * Manages work mode state and actions for a working teen.
 * Provides schedule-based automatic activation and manual start/stop controls.
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { doc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore'
import { getFirestoreDb } from '../lib/firebase'
import type { WorkModeState, WorkModeSession, WorkSchedule } from '@fledgely/shared'

interface UseWorkModeOptions {
  childId: string | null
  familyId: string | null
  /** Work schedules from config - needed for automatic activation */
  schedules?: WorkSchedule[]
  /** Whether manual activation is allowed */
  allowManualActivation?: boolean
}

interface UseWorkModeReturn {
  // State
  workState: WorkModeState | null
  loading: boolean
  error: string | null
  isActive: boolean
  currentSession: WorkModeSession | null

  // Timer
  timeRemainingMs: number | null
  timeRemainingFormatted: string | null
  timeElapsedMs: number | null
  timeElapsedFormatted: string | null

  // Actions
  startWorkMode: () => Promise<void>
  stopWorkMode: () => Promise<void>

  // Schedule info
  isInScheduledHours: boolean
  currentSchedule: WorkSchedule | null
  nextScheduleStart: Date | null

  // Stats
  totalSessionsToday: number
  totalWorkTimeToday: number
}

/**
 * Generate a unique session ID
 */
function generateSessionId(): string {
  return `work-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Format milliseconds as "Xm" or "Xh Ym"
 */
function formatTime(ms: number): string {
  if (ms <= 0) return '0m'

  const totalMinutes = Math.ceil(ms / (60 * 1000))
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`
  }
  return `${minutes}m`
}

/**
 * Get the start of today (midnight)
 */
function getTodayStart(): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return today.getTime()
}

/**
 * Get current day of week as lowercase string
 */
function getCurrentDayOfWeek(): string {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
  return days[new Date().getDay()]
}

/**
 * Parse time string "HH:MM" to minutes since midnight
 */
function parseTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

/**
 * Get current time as minutes since midnight
 */
function getCurrentTimeMinutes(): number {
  const now = new Date()
  return now.getHours() * 60 + now.getMinutes()
}

/**
 * Check if current time falls within a schedule
 */
function isWithinSchedule(schedule: WorkSchedule): boolean {
  if (!schedule.isEnabled) return false

  const currentDay = getCurrentDayOfWeek()
  if (!schedule.days.includes(currentDay as WorkSchedule['days'][number])) return false

  const currentMinutes = getCurrentTimeMinutes()
  const startMinutes = parseTimeToMinutes(schedule.startTime)
  const endMinutes = parseTimeToMinutes(schedule.endTime)

  // Handle schedules that cross midnight
  if (endMinutes < startMinutes) {
    return currentMinutes >= startMinutes || currentMinutes < endMinutes
  }

  return currentMinutes >= startMinutes && currentMinutes < endMinutes
}

/**
 * Calculate time remaining in schedule
 */
function getScheduleTimeRemaining(schedule: WorkSchedule): number {
  const currentMinutes = getCurrentTimeMinutes()
  const endMinutes = parseTimeToMinutes(schedule.endTime)
  const startMinutes = parseTimeToMinutes(schedule.startTime)

  let remainingMinutes: number
  if (endMinutes < startMinutes) {
    // Schedule crosses midnight
    if (currentMinutes >= startMinutes) {
      remainingMinutes = 24 * 60 - currentMinutes + endMinutes
    } else {
      remainingMinutes = endMinutes - currentMinutes
    }
  } else {
    remainingMinutes = endMinutes - currentMinutes
  }

  return Math.max(0, remainingMinutes * 60 * 1000)
}

/**
 * Find the next schedule start time
 */
function getNextScheduleStart(schedules: WorkSchedule[]): Date | null {
  if (!schedules.length) return null

  const now = new Date()
  const currentDay = now.getDay()
  const currentMinutes = getCurrentTimeMinutes()
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

  let nearestDate: Date | null = null
  let nearestDiff = Infinity

  for (const schedule of schedules) {
    if (!schedule.isEnabled) continue

    for (const dayName of schedule.days) {
      const dayIndex = dayNames.indexOf(dayName)
      const startMinutes = parseTimeToMinutes(schedule.startTime)

      // Calculate days until this schedule day
      let daysUntil = dayIndex - currentDay
      if (daysUntil < 0) daysUntil += 7

      // If same day, check if start time is in the future
      if (daysUntil === 0 && startMinutes <= currentMinutes) {
        daysUntil = 7 // Next week
      }

      const scheduleDate = new Date(now)
      scheduleDate.setDate(scheduleDate.getDate() + daysUntil)
      scheduleDate.setHours(Math.floor(startMinutes / 60), startMinutes % 60, 0, 0)

      const diff = scheduleDate.getTime() - now.getTime()
      if (diff > 0 && diff < nearestDiff) {
        nearestDiff = diff
        nearestDate = scheduleDate
      }
    }
  }

  return nearestDate
}

const DEFAULT_WORK_STATE: Omit<WorkModeState, 'childId' | 'familyId'> = {
  isActive: false,
  currentSession: null,
  totalSessionsToday: 0,
  totalWorkTimeToday: 0,
  updatedAt: Date.now(),
}

export function useWorkMode({
  childId,
  familyId,
  schedules = [],
  allowManualActivation = true,
}: UseWorkModeOptions): UseWorkModeReturn {
  const [workState, setWorkState] = useState<WorkModeState | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeRemainingMs, setTimeRemainingMs] = useState<number | null>(null)
  const [timeElapsedMs, setTimeElapsedMs] = useState<number | null>(null)

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const scheduleCheckRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const isProcessingRef = useRef(false)

  // Find current active schedule
  const activeScheduleInfo = useMemo(() => {
    for (const schedule of schedules) {
      if (isWithinSchedule(schedule)) {
        return {
          schedule,
          timeRemaining: getScheduleTimeRemaining(schedule),
        }
      }
    }
    return null
  }, [schedules])

  const isInScheduledHours = activeScheduleInfo !== null
  const currentSchedule = activeScheduleInfo?.schedule ?? null
  const nextScheduleStart = useMemo(
    () => (isInScheduledHours ? null : getNextScheduleStart(schedules)),
    [isInScheduledHours, schedules]
  )

  // Subscribe to work mode state
  useEffect(() => {
    if (!childId || !familyId) {
      setLoading(false)
      return
    }

    const stateRef = doc(getFirestoreDb(), 'families', familyId, 'workMode', childId)

    const unsubscribe = onSnapshot(
      stateRef,
      async (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data() as WorkModeState

          // Check if we need to reset daily stats (new day)
          const todayStart = getTodayStart()
          if (data.updatedAt < todayStart) {
            try {
              await updateDoc(stateRef, {
                totalSessionsToday: 0,
                totalWorkTimeToday: 0,
                updatedAt: Date.now(),
              })
            } catch (err) {
              console.error('[useWorkMode] Failed to reset daily stats:', err)
            }
          }

          setWorkState(data)
        } else {
          // Initialize work mode state
          const initialState: WorkModeState = {
            ...DEFAULT_WORK_STATE,
            childId,
            familyId,
            updatedAt: Date.now(),
          }
          setDoc(stateRef, initialState)
          setWorkState(initialState)
        }
        setLoading(false)
      },
      (err) => {
        console.error('[useWorkMode] Error:', err)
        setError('Failed to load work mode')
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [childId, familyId])

  // Schedule-based automatic activation check
  useEffect(() => {
    if (!childId || !familyId || !schedules.length) return

    const checkSchedule = async () => {
      if (isProcessingRef.current) return

      const activeSchedule = schedules.find((s) => isWithinSchedule(s))

      if (activeSchedule && !workState?.isActive) {
        // Auto-start work mode
        isProcessingRef.current = true
        try {
          const stateRef = doc(getFirestoreDb(), 'families', familyId, 'workMode', childId)
          const now = Date.now()

          const newSession: WorkModeSession = {
            id: generateSessionId(),
            childId,
            familyId,
            status: 'active',
            activationType: 'scheduled',
            scheduleId: activeSchedule.id,
            scheduleName: activeSchedule.name,
            startedAt: now,
            endedAt: null,
            createdAt: now,
            updatedAt: now,
          }

          const currentSessionsToday = workState?.totalSessionsToday ?? 0

          await updateDoc(stateRef, {
            isActive: true,
            currentSession: newSession,
            totalSessionsToday: currentSessionsToday + 1,
            updatedAt: now,
          }).catch(async () => {
            await setDoc(stateRef, {
              childId,
              familyId,
              isActive: true,
              currentSession: newSession,
              totalSessionsToday: 1,
              totalWorkTimeToday: 0,
              updatedAt: now,
            })
          })
        } finally {
          isProcessingRef.current = false
        }
      } else if (
        !activeSchedule &&
        workState?.isActive &&
        workState.currentSession?.activationType === 'scheduled'
      ) {
        // Auto-stop scheduled work mode when schedule ends
        isProcessingRef.current = true
        try {
          const stateRef = doc(getFirestoreDb(), 'families', familyId, 'workMode', childId)
          const now = Date.now()
          const session = workState.currentSession
          const sessionDuration = now - session.startedAt

          await updateDoc(stateRef, {
            isActive: false,
            'currentSession.status': 'inactive',
            'currentSession.endedAt': now,
            'currentSession.updatedAt': now,
            totalWorkTimeToday: (workState.totalWorkTimeToday ?? 0) + sessionDuration,
            updatedAt: now,
          })
        } finally {
          isProcessingRef.current = false
        }
      }
    }

    // Check immediately and then every minute
    checkSchedule()
    scheduleCheckRef.current = setInterval(checkSchedule, 60000)

    return () => {
      if (scheduleCheckRef.current) {
        clearInterval(scheduleCheckRef.current)
        scheduleCheckRef.current = null
      }
    }
  }, [
    childId,
    familyId,
    schedules,
    workState?.isActive,
    workState?.currentSession?.activationType,
    workState?.totalSessionsToday,
    workState?.totalWorkTimeToday,
  ])

  // Timer effect for elapsed time and schedule-based remaining time
  useEffect(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }

    const session = workState?.currentSession
    if (!session || session.status !== 'active') {
      setTimeRemainingMs(null)
      setTimeElapsedMs(null)
      return
    }

    const updateTimes = () => {
      const elapsed = Date.now() - session.startedAt
      setTimeElapsedMs(elapsed)

      // For scheduled sessions, calculate time remaining in schedule
      if (session.activationType === 'scheduled' && currentSchedule) {
        setTimeRemainingMs(getScheduleTimeRemaining(currentSchedule))
      } else {
        setTimeRemainingMs(null)
      }
    }

    updateTimes()
    timerRef.current = setInterval(updateTimes, 1000)

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- workState?.currentSession triggers updates correctly
  }, [workState?.currentSession, currentSchedule])

  // Start work mode manually
  const startWorkMode = useCallback(async () => {
    if (!childId || !familyId || !allowManualActivation) return
    if (workState?.isActive) return

    const stateRef = doc(getFirestoreDb(), 'families', familyId, 'workMode', childId)
    const now = Date.now()

    const newSession: WorkModeSession = {
      id: generateSessionId(),
      childId,
      familyId,
      status: 'active',
      activationType: 'manual',
      scheduleId: null,
      scheduleName: null,
      startedAt: now,
      endedAt: null,
      createdAt: now,
      updatedAt: now,
    }

    const currentSessionsToday = workState?.totalSessionsToday ?? 0

    await updateDoc(stateRef, {
      isActive: true,
      currentSession: newSession,
      totalSessionsToday: currentSessionsToday + 1,
      updatedAt: now,
    }).catch(async () => {
      await setDoc(stateRef, {
        childId,
        familyId,
        isActive: true,
        currentSession: newSession,
        totalSessionsToday: 1,
        totalWorkTimeToday: 0,
        updatedAt: now,
      })
    })
  }, [childId, familyId, allowManualActivation, workState])

  // Stop work mode manually
  const stopWorkMode = useCallback(async () => {
    if (!childId || !familyId || !workState?.currentSession) return

    const stateRef = doc(getFirestoreDb(), 'families', familyId, 'workMode', childId)
    const now = Date.now()
    const session = workState.currentSession
    const sessionDuration = now - session.startedAt

    await updateDoc(stateRef, {
      isActive: false,
      'currentSession.status': 'inactive',
      'currentSession.endedAt': now,
      'currentSession.updatedAt': now,
      totalWorkTimeToday: (workState.totalWorkTimeToday ?? 0) + sessionDuration,
      updatedAt: now,
    })
  }, [childId, familyId, workState])

  // Derived values
  const isActive = workState?.isActive ?? false
  const currentSession = workState?.currentSession ?? null
  const timeRemainingFormatted = timeRemainingMs !== null ? formatTime(timeRemainingMs) : null
  const timeElapsedFormatted = timeElapsedMs !== null ? formatTime(timeElapsedMs) : null

  return {
    workState,
    loading,
    error,
    isActive,
    currentSession,
    timeRemainingMs,
    timeRemainingFormatted,
    timeElapsedMs,
    timeElapsedFormatted,
    startWorkMode,
    stopWorkMode,
    isInScheduledHours,
    currentSchedule,
    nextScheduleStart,
    totalSessionsToday: workState?.totalSessionsToday ?? 0,
    totalWorkTimeToday: workState?.totalWorkTimeToday ?? 0,
  }
}
