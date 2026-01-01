/**
 * useFocusModeWithCalendar Hook - Story 33.4
 *
 * Extends focus mode with calendar integration for auto-activation.
 * Monitors calendar events and triggers focus mode automatically.
 *
 * Story 33.4 AC3: Automatic Focus Mode Activation
 * - Focus mode auto-activates at event start time
 * - Notification sent when starting
 * - Duration matches calendar event
 * - Auto-deactivates at event end
 *
 * Story 33.4 AC4: Manual Override
 * - Child can manually stop focus mode
 * - Early exit is logged (not punitive)
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { doc, updateDoc, setDoc } from 'firebase/firestore'
import { getFirestoreDb } from '../lib/firebase'
import { useFocusMode } from './useFocusMode'
import { useCalendarIntegration } from './useCalendarIntegration'
import type { FocusModeSession, CalendarEvent } from '@fledgely/shared'

interface UseFocusModeWithCalendarOptions {
  childId: string | null
  familyId: string | null
}

interface UseFocusModeWithCalendarReturn {
  // All focus mode state/actions
  focusState: ReturnType<typeof useFocusMode>['focusState']
  loading: boolean
  error: string | null
  isActive: boolean
  currentSession: FocusModeSession | null
  timeRemainingMs: number | null
  timeRemainingFormatted: string | null
  startFocusMode: ReturnType<typeof useFocusMode>['startFocusMode']
  stopFocusMode: () => Promise<void>
  totalSessionsToday: number
  totalFocusTimeToday: number

  // Calendar integration state
  isCalendarConnected: boolean
  autoActivationEnabled: boolean
  currentCalendarEvent: CalendarEvent | null
  upcomingCalendarEvent: CalendarEvent | null
  isCalendarTriggered: boolean

  // Manual override info
  endedEarlyMinutes: number | null
}

/**
 * Generate a unique session ID
 */
function generateSessionId(): string {
  return `focus-cal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

export function useFocusModeWithCalendar({
  childId,
  familyId,
}: UseFocusModeWithCalendarOptions): UseFocusModeWithCalendarReturn {
  // Use base focus mode hook
  const focusMode = useFocusMode({ childId, familyId })

  // Use calendar integration hook
  const calendar = useCalendarIntegration({ childId, familyId })

  // Track if we've already triggered for the current event
  const triggeredEventIdRef = useRef<string | null>(null)

  // Track if focus mode was ended early
  const [endedEarlyMinutes, setEndedEarlyMinutes] = useState<number | null>(null)

  // Check if current session was calendar-triggered
  const isCalendarTriggered =
    (focusMode.currentSession as FocusModeSession & { triggeredBy?: string })?.triggeredBy ===
    'calendar'

  // Auto-activate focus mode when calendar event starts
  useEffect(() => {
    if (!childId || !familyId) return
    if (!calendar.config?.autoActivateFocusMode) return
    if (!calendar.isConnected) return

    const currentEvent = calendar.currentFocusEvent

    // If there's an active focus event and focus mode is not active
    if (currentEvent && !focusMode.isActive) {
      // Check if we've already triggered for this event
      if (triggeredEventIdRef.current === currentEvent.id) {
        return
      }

      // Auto-start focus mode
      triggeredEventIdRef.current = currentEvent.id
      startCalendarTriggeredFocus(currentEvent).catch((err) => {
        console.error('[useFocusModeWithCalendar] Auto-start failed:', err)
        triggeredEventIdRef.current = null
      })
    }
  }, [
    childId,
    familyId,
    calendar.config?.autoActivateFocusMode,
    calendar.isConnected,
    calendar.currentFocusEvent,
    focusMode.isActive,
  ])

  // Auto-deactivate when calendar event ends
  useEffect(() => {
    if (!childId || !familyId) return
    if (!focusMode.isActive) return
    if (!isCalendarTriggered) return

    const session = focusMode.currentSession as FocusModeSession & {
      calendarEventId?: string
    }
    if (!session?.calendarEventId) return

    // Find the event this session was triggered by
    const event = calendar.events.find((e) => e.id === session.calendarEventId)
    if (!event) return

    // Check if event has ended
    if (Date.now() >= event.endTime) {
      // Auto-stop focus mode
      stopCalendarTriggeredFocus(true).catch((err) => {
        console.error('[useFocusModeWithCalendar] Auto-stop failed:', err)
      })
    }
  }, [
    childId,
    familyId,
    focusMode.isActive,
    isCalendarTriggered,
    focusMode.currentSession,
    calendar.events,
  ])

  /**
   * Start focus mode triggered by calendar event
   */
  const startCalendarTriggeredFocus = useCallback(
    async (event: CalendarEvent) => {
      if (!childId || !familyId) return

      const stateRef = doc(getFirestoreDb(), 'families', familyId, 'focusMode', childId)
      const now = Date.now()
      const durationMs = event.endTime - now

      const newSession: FocusModeSession & {
        triggeredBy: 'calendar'
        calendarEventId: string
        calendarEventTitle: string
      } = {
        id: generateSessionId(),
        childId,
        familyId,
        status: 'active',
        durationType: 'untilOff', // Calendar sessions use custom duration
        durationMs,
        startedAt: now,
        endedAt: null,
        completedFully: false,
        createdAt: now,
        updatedAt: now,
        triggeredBy: 'calendar',
        calendarEventId: event.id,
        calendarEventTitle: event.title,
      }

      const currentSessionsToday = focusMode.totalSessionsToday

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

      console.log(`[useFocusModeWithCalendar] Auto-started focus mode for "${event.title}"`)
    },
    [childId, familyId, focusMode.totalSessionsToday]
  )

  /**
   * Stop calendar-triggered focus mode
   */
  const stopCalendarTriggeredFocus = useCallback(
    async (completedFully: boolean) => {
      if (!childId || !familyId || !focusMode.currentSession) return

      const stateRef = doc(getFirestoreDb(), 'families', familyId, 'focusMode', childId)
      const now = Date.now()
      const session = focusMode.currentSession
      const sessionDuration = now - session.startedAt

      // Calculate if ended early
      if (!completedFully && session.durationMs) {
        const remainingMs = session.durationMs - sessionDuration
        const remainingMinutes = Math.ceil(remainingMs / (60 * 1000))
        if (remainingMinutes > 0) {
          setEndedEarlyMinutes(remainingMinutes)
        }
      } else {
        setEndedEarlyMinutes(null)
      }

      await updateDoc(stateRef, {
        isActive: false,
        'currentSession.status': 'inactive',
        'currentSession.endedAt': now,
        'currentSession.completedFully': completedFully,
        'currentSession.updatedAt': now,
        totalFocusTimeToday: focusMode.totalFocusTimeToday + sessionDuration,
        updatedAt: now,
      })

      // Reset triggered event ref
      triggeredEventIdRef.current = null

      console.log(`[useFocusModeWithCalendar] Focus mode ended, completedFully: ${completedFully}`)
    },
    [childId, familyId, focusMode.currentSession, focusMode.totalFocusTimeToday]
  )

  /**
   * Manual stop (early exit) with calendar awareness
   */
  const stopFocusMode = useCallback(async () => {
    if (isCalendarTriggered) {
      await stopCalendarTriggeredFocus(false)
    } else {
      await focusMode.stopFocusMode()
    }
  }, [isCalendarTriggered, stopCalendarTriggeredFocus, focusMode])

  return {
    // Base focus mode state
    focusState: focusMode.focusState,
    loading: focusMode.loading || calendar.loading,
    error: focusMode.error || calendar.error,
    isActive: focusMode.isActive,
    currentSession: focusMode.currentSession,
    timeRemainingMs: focusMode.timeRemainingMs,
    timeRemainingFormatted: focusMode.timeRemainingFormatted,
    startFocusMode: focusMode.startFocusMode,
    stopFocusMode,
    totalSessionsToday: focusMode.totalSessionsToday,
    totalFocusTimeToday: focusMode.totalFocusTimeToday,

    // Calendar integration state
    isCalendarConnected: calendar.isConnected,
    autoActivationEnabled: calendar.config?.autoActivateFocusMode ?? false,
    currentCalendarEvent: calendar.currentFocusEvent,
    upcomingCalendarEvent: calendar.upcomingFocusEvent,
    isCalendarTriggered,

    // Manual override info
    endedEarlyMinutes,
  }
}
