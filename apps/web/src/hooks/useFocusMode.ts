/**
 * useFocusMode Hook - Story 33.1
 *
 * Manages focus mode state and actions for a child.
 * Provides start/stop focus mode, countdown timer, and session tracking.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { doc, onSnapshot, setDoc, updateDoc, runTransaction, increment } from 'firebase/firestore'
import { getFirestoreDb } from '../lib/firebase'
import type {
  FocusModeState,
  FocusModeSession,
  FocusModeDuration,
  FocusModeSessionSummary,
} from '@fledgely/shared'
import { FOCUS_MODE_DURATIONS } from '@fledgely/shared'

interface UseFocusModeOptions {
  childId: string | null
  familyId: string | null
}

interface UseFocusModeReturn {
  // State
  focusState: FocusModeState | null
  loading: boolean
  error: string | null
  isActive: boolean
  currentSession: FocusModeSession | null

  // Timer
  timeRemainingMs: number | null
  timeRemainingFormatted: string | null

  // Actions
  startFocusMode: (duration: FocusModeDuration) => Promise<void>
  stopFocusMode: () => Promise<void>

  // Stats
  totalSessionsToday: number
  totalFocusTimeToday: number
}

/**
 * Generate a unique session ID
 */
function generateSessionId(): string {
  return `focus-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Format milliseconds as "Xm" or "Xh Ym"
 */
function formatTimeRemaining(ms: number): string {
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
 * Get today's date in YYYY-MM-DD format
 */
function getTodayDate(): string {
  try {
    return new Date().toLocaleDateString('en-CA', {
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    })
  } catch {
    return new Date().toISOString().split('T')[0]
  }
}

const DEFAULT_FOCUS_STATE: Omit<FocusModeState, 'childId' | 'familyId'> = {
  isActive: false,
  currentSession: null,
  totalSessionsToday: 0,
  totalFocusTimeToday: 0,
  updatedAt: Date.now(),
}

export function useFocusMode({ childId, familyId }: UseFocusModeOptions): UseFocusModeReturn {
  const [focusState, setFocusState] = useState<FocusModeState | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeRemainingMs, setTimeRemainingMs] = useState<number | null>(null)

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const isCompletingRef = useRef(false) // Prevent concurrent completion calls

  // Subscribe to focus mode state
  useEffect(() => {
    if (!childId || !familyId) {
      setLoading(false)
      return
    }

    const stateRef = doc(getFirestoreDb(), 'families', familyId, 'focusMode', childId)

    const unsubscribe = onSnapshot(
      stateRef,
      async (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data() as FocusModeState

          // Check if we need to reset daily stats (new day)
          // Use transaction to prevent race condition with multiple clients
          const todayStart = getTodayStart()
          if (data.updatedAt < todayStart) {
            try {
              await runTransaction(getFirestoreDb(), async (transaction) => {
                const freshDoc = await transaction.get(stateRef)
                if (freshDoc.exists()) {
                  const freshData = freshDoc.data() as FocusModeState
                  // Double-check within transaction to prevent race
                  if (freshData.updatedAt < todayStart) {
                    transaction.update(stateRef, {
                      totalSessionsToday: 0,
                      totalFocusTimeToday: 0,
                      updatedAt: Date.now(),
                    })
                  }
                }
              })
            } catch (err) {
              console.error('[useFocusMode] Failed to reset daily stats:', err)
            }
          }

          setFocusState(data)
        } else {
          // Initialize focus mode state
          const initialState: FocusModeState = {
            ...DEFAULT_FOCUS_STATE,
            childId,
            familyId,
            updatedAt: Date.now(),
          }
          setDoc(stateRef, initialState)
          setFocusState(initialState)
        }
        setLoading(false)
      },
      (err) => {
        console.error('[useFocusMode] Error:', err)
        setError('Failed to load focus mode')
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [childId, familyId])

  // Countdown timer effect
  useEffect(() => {
    // Clear any existing timer first
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }

    const session = focusState?.currentSession
    if (!session || session.status !== 'active' || !session.durationMs) {
      setTimeRemainingMs(null)
      return
    }

    // Capture values for this effect run to avoid stale closures
    const sessionStartedAt = session.startedAt
    const sessionDurationMs = session.durationMs
    const currentChildId = childId
    const currentFamilyId = familyId

    // Calculate initial time remaining
    const calculateRemaining = () => {
      const elapsed = Date.now() - sessionStartedAt
      const remaining = sessionDurationMs - elapsed
      return Math.max(0, remaining)
    }

    setTimeRemainingMs(calculateRemaining())

    // Update every second
    timerRef.current = setInterval(async () => {
      const remaining = calculateRemaining()
      setTimeRemainingMs(remaining)

      // Auto-complete when time is up (with concurrent call protection)
      if (remaining <= 0 && currentChildId && currentFamilyId && !isCompletingRef.current) {
        isCompletingRef.current = true
        // Clear timer immediately to prevent duplicate calls
        if (timerRef.current) {
          clearInterval(timerRef.current)
          timerRef.current = null
        }
        try {
          // Complete session directly here to avoid stale closure
          const stateRef = doc(
            getFirestoreDb(),
            'families',
            currentFamilyId,
            'focusMode',
            currentChildId
          )
          const now = Date.now()
          const sessionDuration = now - sessionStartedAt
          const currentTotalTime = focusState?.totalFocusTimeToday ?? 0

          await updateDoc(stateRef, {
            isActive: false,
            'currentSession.status': 'inactive',
            'currentSession.endedAt': now,
            'currentSession.completedFully': true,
            'currentSession.updatedAt': now,
            totalFocusTimeToday: currentTotalTime + sessionDuration,
            updatedAt: now,
          })
        } finally {
          isCompletingRef.current = false
        }
      }
    }, 1000)

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }, [focusState?.currentSession, focusState?.totalFocusTimeToday, childId, familyId])

  // Complete the current session
  const completeSession = useCallback(
    async (completedFully: boolean) => {
      if (!childId || !familyId || !focusState?.currentSession) return

      // Prevent concurrent completion calls
      if (isCompletingRef.current) return
      isCompletingRef.current = true

      try {
        const db = getFirestoreDb()
        const stateRef = doc(db, 'families', familyId, 'focusMode', childId)
        const now = Date.now()
        const session = focusState.currentSession
        const sessionDuration = now - session.startedAt
        const durationMinutes = Math.round(sessionDuration / (60 * 1000))

        const completedSession: FocusModeSession = {
          ...session,
          status: 'inactive',
          endedAt: now,
          completedFully,
          updatedAt: now,
        }

        // Update main focus mode state
        await updateDoc(stateRef, {
          isActive: false,
          currentSession: completedSession,
          totalFocusTimeToday: focusState.totalFocusTimeToday + sessionDuration,
          updatedAt: now,
        })

        // Save session to history for analytics (Story 33.5)
        const sessionSummary: FocusModeSessionSummary = {
          sessionId: session.id,
          startedAt: session.startedAt,
          endedAt: now,
          durationMinutes,
          durationType: session.durationType,
          completedFully,
          triggeredBy: 'manual', // Note: calendar trigger would come from useFocusModeWithCalendar
          calendarEventTitle: null,
        }

        // Save to history collection
        const historyRef = doc(
          db,
          'families',
          familyId,
          'focusModeHistory',
          childId,
          'sessions',
          session.id
        )
        await setDoc(historyRef, {
          ...sessionSummary,
          childId,
          familyId,
          createdAt: now,
        })

        // Update daily summary for analytics
        const todayDate = getTodayDate()
        const dailySummaryRef = doc(
          db,
          'families',
          familyId,
          'focusModeDailySummary',
          childId,
          'days',
          todayDate
        )

        // Use setDoc with merge to create or update
        await setDoc(
          dailySummaryRef,
          {
            childId,
            familyId,
            date: todayDate,
            sessionCount: increment(1),
            totalMinutes: increment(durationMinutes),
            completedSessions: increment(completedFully ? 1 : 0),
            earlyExits: increment(completedFully ? 0 : 1),
            manualSessions: increment(1),
            calendarSessions: increment(0),
            updatedAt: now,
          },
          { merge: true }
        )
      } finally {
        isCompletingRef.current = false
      }
    },
    [childId, familyId, focusState]
  )

  // Start focus mode
  const startFocusMode = useCallback(
    async (duration: FocusModeDuration) => {
      if (!childId || !familyId) return

      const stateRef = doc(getFirestoreDb(), 'families', familyId, 'focusMode', childId)
      const now = Date.now()
      const durationMs = FOCUS_MODE_DURATIONS[duration]

      const newSession: FocusModeSession = {
        id: generateSessionId(),
        childId,
        familyId,
        status: 'active',
        durationType: duration,
        durationMs,
        startedAt: now,
        endedAt: null,
        completedFully: false,
        createdAt: now,
        updatedAt: now,
      }

      const currentSessionsToday = focusState?.totalSessionsToday ?? 0

      await updateDoc(stateRef, {
        isActive: true,
        currentSession: newSession,
        totalSessionsToday: currentSessionsToday + 1,
        updatedAt: now,
      }).catch(async () => {
        // Document might not exist, create it
        await setDoc(stateRef, {
          childId,
          familyId,
          isActive: true,
          currentSession: newSession,
          totalSessionsToday: 1,
          totalFocusTimeToday: 0,
          updatedAt: now,
        })
      })
    },
    [childId, familyId, focusState]
  )

  // Stop focus mode (child-initiated)
  const stopFocusMode = useCallback(async () => {
    await completeSession(false)
  }, [completeSession])

  // Derived values
  const isActive = focusState?.isActive ?? false
  const currentSession = focusState?.currentSession ?? null
  const timeRemainingFormatted =
    timeRemainingMs !== null ? formatTimeRemaining(timeRemainingMs) : null

  return {
    focusState,
    loading,
    error,
    isActive,
    currentSession,
    timeRemainingMs,
    timeRemainingFormatted,
    startFocusMode,
    stopFocusMode,
    totalSessionsToday: focusState?.totalSessionsToday ?? 0,
    totalFocusTimeToday: focusState?.totalFocusTimeToday ?? 0,
  }
}
