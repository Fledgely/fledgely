/**
 * useCalendarIntegration Hook - Story 33.4
 *
 * Manages calendar integration configuration and events for a child.
 * Supports Google Calendar connection, event syncing, and focus mode triggers.
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { doc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore'
import { getFirestoreDb } from '../lib/firebase'
import type {
  CalendarIntegrationConfig,
  CalendarEvent,
  CachedCalendarEvents,
} from '@fledgely/shared'
import { CALENDAR_FOCUS_TRIGGER_KEYWORDS } from '@fledgely/shared'

interface UseCalendarIntegrationOptions {
  childId: string | null
  familyId: string | null
}

interface UseCalendarIntegrationReturn {
  // State
  config: CalendarIntegrationConfig | null
  events: CalendarEvent[]
  loading: boolean
  error: string | null

  // Connection status
  isConnected: boolean
  connectionStatus: 'connected' | 'disconnected' | 'error' | 'pending'
  connectedEmail: string | null

  // Configuration actions
  updateAutoActivation: (enabled: boolean) => Promise<void>
  updateSyncFrequency: (minutes: number) => Promise<void>
  addKeyword: (keyword: string) => Promise<void>
  removeKeyword: (keyword: string) => Promise<void>
  resetKeywords: () => Promise<void>

  // Focus-eligible events
  focusEligibleEvents: CalendarEvent[]
  currentFocusEvent: CalendarEvent | null
  upcomingFocusEvent: CalendarEvent | null

  // Keyword matching utility
  matchesKeywords: (text: string) => { matches: boolean; matchedKeywords: string[] }

  // Sync status
  lastSyncAt: number | null
  lastSyncError: string | null
}

const DEFAULT_CONFIG: Omit<CalendarIntegrationConfig, 'childId' | 'familyId'> = {
  isEnabled: false,
  provider: null,
  connectionStatus: 'disconnected',
  connectedEmail: null,
  connectedAt: null,
  syncFrequencyMinutes: 30,
  autoActivateFocusMode: false,
  focusTriggerKeywords: [...CALENDAR_FOCUS_TRIGGER_KEYWORDS],
  lastSyncAt: null,
  lastSyncError: null,
  createdAt: Date.now(),
  updatedAt: Date.now(),
}

/**
 * Check if an event is currently active (now is between start and end)
 */
function isEventActive(event: CalendarEvent): boolean {
  const now = Date.now()
  return now >= event.startTime && now < event.endTime
}

/**
 * Check if an event is upcoming (starts within the next hour)
 */
function isEventUpcoming(event: CalendarEvent): boolean {
  const now = Date.now()
  const oneHourFromNow = now + 60 * 60 * 1000
  return event.startTime > now && event.startTime <= oneHourFromNow
}

/**
 * Match text against keywords (case-insensitive)
 */
function matchTextAgainstKeywords(
  text: string,
  keywords: string[]
): { matches: boolean; matchedKeywords: string[] } {
  const lowerText = text.toLowerCase()
  const matched: string[] = []

  for (const keyword of keywords) {
    if (lowerText.includes(keyword.toLowerCase())) {
      matched.push(keyword)
    }
  }

  return {
    matches: matched.length > 0,
    matchedKeywords: matched,
  }
}

export function useCalendarIntegration({
  childId,
  familyId,
}: UseCalendarIntegrationOptions): UseCalendarIntegrationReturn {
  const [config, setConfig] = useState<CalendarIntegrationConfig | null>(null)
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Subscribe to calendar integration config
  useEffect(() => {
    if (!childId || !familyId) {
      setLoading(false)
      return
    }

    const configRef = doc(getFirestoreDb(), 'families', familyId, 'calendarIntegration', childId)

    const unsubscribe = onSnapshot(
      configRef,
      (snapshot) => {
        if (snapshot.exists()) {
          setConfig(snapshot.data() as CalendarIntegrationConfig)
        } else {
          // Initialize config if it doesn't exist
          const initialConfig: CalendarIntegrationConfig = {
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
        console.error('[useCalendarIntegration] Config error:', err)
        setError('Failed to load calendar integration')
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [childId, familyId])

  // Subscribe to cached calendar events
  useEffect(() => {
    if (!childId || !familyId) {
      return
    }

    const eventsRef = doc(getFirestoreDb(), 'families', familyId, 'calendarEvents', childId)

    const unsubscribe = onSnapshot(
      eventsRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data() as CachedCalendarEvents
          // Filter out expired events - guard against missing events array
          const now = Date.now()
          const validEvents = (data.events ?? []).filter((event) => event.endTime > now)
          setEvents(validEvents)
        } else {
          setEvents([])
        }
      },
      (err) => {
        console.error('[useCalendarIntegration] Events error:', err)
        // Don't set error for events - config is more important
      }
    )

    return () => unsubscribe()
  }, [childId, familyId])

  // Update auto-activation setting
  const updateAutoActivation = useCallback(
    async (enabled: boolean) => {
      if (!childId || !familyId) return

      const configRef = doc(getFirestoreDb(), 'families', familyId, 'calendarIntegration', childId)

      await updateDoc(configRef, {
        autoActivateFocusMode: enabled,
        updatedAt: Date.now(),
      }).catch(async () => {
        // Document might not exist, create it
        await setDoc(configRef, {
          ...DEFAULT_CONFIG,
          childId,
          familyId,
          autoActivateFocusMode: enabled,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        })
      })
    },
    [childId, familyId]
  )

  // Update sync frequency
  const updateSyncFrequency = useCallback(
    async (minutes: number) => {
      if (!childId || !familyId) return
      if (![15, 30, 60].includes(minutes)) {
        console.error('[useCalendarIntegration] Invalid sync frequency:', minutes)
        return
      }

      const configRef = doc(getFirestoreDb(), 'families', familyId, 'calendarIntegration', childId)

      await updateDoc(configRef, {
        syncFrequencyMinutes: minutes,
        updatedAt: Date.now(),
      })
    },
    [childId, familyId]
  )

  // Add a keyword
  const addKeyword = useCallback(
    async (keyword: string) => {
      if (!childId || !familyId || !config) return

      const trimmedKeyword = keyword.trim().toLowerCase()
      if (!trimmedKeyword) return
      if (config.focusTriggerKeywords.includes(trimmedKeyword)) return

      const configRef = doc(getFirestoreDb(), 'families', familyId, 'calendarIntegration', childId)

      await updateDoc(configRef, {
        focusTriggerKeywords: [...config.focusTriggerKeywords, trimmedKeyword],
        updatedAt: Date.now(),
      })
    },
    [childId, familyId, config]
  )

  // Remove a keyword
  const removeKeyword = useCallback(
    async (keyword: string) => {
      if (!childId || !familyId || !config) return

      const configRef = doc(getFirestoreDb(), 'families', familyId, 'calendarIntegration', childId)

      await updateDoc(configRef, {
        focusTriggerKeywords: config.focusTriggerKeywords.filter(
          (k) => k.toLowerCase() !== keyword.toLowerCase()
        ),
        updatedAt: Date.now(),
      })
    },
    [childId, familyId, config]
  )

  // Reset keywords to defaults
  const resetKeywords = useCallback(async () => {
    if (!childId || !familyId) return

    const configRef = doc(getFirestoreDb(), 'families', familyId, 'calendarIntegration', childId)

    await updateDoc(configRef, {
      focusTriggerKeywords: [...CALENDAR_FOCUS_TRIGGER_KEYWORDS],
      updatedAt: Date.now(),
    })
  }, [childId, familyId])

  // Match text against configured keywords
  const matchesKeywords = useCallback(
    (text: string): { matches: boolean; matchedKeywords: string[] } => {
      if (!config) {
        return { matches: false, matchedKeywords: [] }
      }
      return matchTextAgainstKeywords(text, config.focusTriggerKeywords)
    },
    [config]
  )

  // Computed: focus-eligible events
  const focusEligibleEvents = useMemo(() => {
    return events.filter((event) => event.isFocusEligible)
  }, [events])

  // Computed: currently active focus event
  const currentFocusEvent = useMemo(() => {
    return focusEligibleEvents.find((event) => isEventActive(event)) ?? null
  }, [focusEligibleEvents])

  // Computed: next upcoming focus event
  const upcomingFocusEvent = useMemo(() => {
    const upcoming = focusEligibleEvents
      .filter((event) => isEventUpcoming(event))
      .sort((a, b) => a.startTime - b.startTime)
    return upcoming[0] ?? null
  }, [focusEligibleEvents])

  // Derived values
  const isConnected = config?.connectionStatus === 'connected'
  const connectionStatus = config?.connectionStatus ?? 'disconnected'
  const connectedEmail = config?.connectedEmail ?? null
  const lastSyncAt = config?.lastSyncAt ?? null
  const lastSyncError = config?.lastSyncError ?? null

  return {
    config,
    events,
    loading,
    error,
    isConnected,
    connectionStatus,
    connectedEmail,
    updateAutoActivation,
    updateSyncFrequency,
    addKeyword,
    removeKeyword,
    resetKeywords,
    focusEligibleEvents,
    currentFocusEvent,
    upcomingFocusEvent,
    matchesKeywords,
    lastSyncAt,
    lastSyncError,
  }
}
