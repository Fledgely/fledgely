'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useAuthContext } from '@/components/providers/AuthProvider'
import {
  createCoCreationSession as createSession,
  getCoCreationSession,
  pauseCoCreationSession,
  resumeCoCreationSession,
  recordSessionContribution,
  completeCoCreationSession,
  updateSessionActivity,
} from '@/services/coCreationSessionService'
import {
  type CoCreationSession,
  type CreateCoCreationSessionInput,
  type SessionContributor,
  type ContributionAction,
  type SessionTermType,
  SESSION_TIMEOUT_CONSTANTS,
  shouldShowTimeoutWarning,
  getTimeUntilTimeout,
  formatTimeRemaining,
  isSessionActive,
} from '@fledgely/contracts'

/**
 * useCoCreationSession Hook
 *
 * Story 5.1: Co-Creation Session Initiation - Task 5
 *
 * Manages co-creation session state including:
 * - Session fetching and caching
 * - Mutation operations (create, pause, resume, contribute)
 * - Activity tracking for timeout warning (AC #6)
 * - 30-minute inactivity timeout detection
 *
 * @example
 * ```tsx
 * const {
 *   session,
 *   loading,
 *   createSession,
 *   pauseSession,
 *   resumeSession,
 *   timeoutWarning,
 * } = useCoCreationSession(sessionId)
 *
 * if (timeoutWarning.show) {
 *   return <TimeoutWarning remaining={timeoutWarning.remaining} />
 * }
 * ```
 */

/**
 * Activity tracking configuration
 */
const ACTIVITY_UPDATE_DEBOUNCE_MS = 5000 // 5 seconds debounce
const TIMEOUT_CHECK_INTERVAL_MS = 10000 // Check timeout every 10 seconds

/**
 * Hook return type
 */
export interface UseCoCreationSessionReturn {
  /** Current session data */
  session: CoCreationSession | null
  /** Whether session is being loaded */
  loading: boolean
  /** Error state */
  error: Error | null
  /** Whether session exists and is active */
  isActive: boolean

  // Mutations
  /** Create a new co-creation session */
  createSession: (input: CreateCoCreationSessionInput) => Promise<{
    success: boolean
    session?: CoCreationSession
    error?: string
  }>
  /** Pause the current session */
  pauseSession: () => Promise<{ success: boolean; error?: string }>
  /** Resume a paused session */
  resumeSession: () => Promise<{ success: boolean; error?: string }>
  /** Record a contribution to the session */
  recordContribution: (input: {
    contributor: SessionContributor
    action: ContributionAction
    termId?: string
    details?: Record<string, unknown>
  }) => Promise<{ success: boolean; error?: string }>
  /** Complete the session (mark ready for signing) */
  completeSession: () => Promise<{ success: boolean; error?: string }>

  // Timeout warning (AC #6)
  /** Timeout warning state */
  timeoutWarning: {
    /** Whether to show the timeout warning */
    show: boolean
    /** Time remaining until timeout (formatted as "M:SS") */
    remainingFormatted: string
    /** Time remaining in milliseconds */
    remainingMs: number
  }

  // Actions
  /** Refresh session data */
  refreshSession: () => Promise<void>
  /** Clear error state */
  clearError: () => void
  /** Mark activity (resets timeout) */
  markActivity: () => void
}

/**
 * Hook for managing co-creation session state
 *
 * @param sessionId - Session ID to fetch, or null if not yet created
 * @returns Session state and mutation functions
 */
export function useCoCreationSession(
  sessionId: string | null
): UseCoCreationSessionReturn {
  const { user: authUser } = useAuthContext()

  // Session state
  const [session, setSession] = useState<CoCreationSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  // Timeout warning state
  const [timeoutWarning, setTimeoutWarning] = useState({
    show: false,
    remainingFormatted: '5:00',
    remainingMs: SESSION_TIMEOUT_CONSTANTS.INACTIVITY_TIMEOUT_MS - SESSION_TIMEOUT_CONSTANTS.INACTIVITY_WARNING_MS,
  })

  // Refs for cleanup and preventing memory leaks
  const mountedRef = useRef(true)
  const fetchedForIdRef = useRef<string | null>(null)
  const isSubmittingRef = useRef(false)
  const activityTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastActivityUpdateRef = useRef<number>(0)

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    if (mountedRef.current) {
      setError(null)
    }
  }, [])

  /**
   * Fetch session data
   */
  const fetchSession = useCallback(async () => {
    if (!sessionId) {
      if (mountedRef.current) {
        setSession(null)
        setLoading(false)
      }
      return
    }

    if (mountedRef.current) {
      setLoading(true)
      setError(null)
    }

    try {
      const data = await getCoCreationSession(sessionId)

      if (mountedRef.current) {
        setSession(data)
        fetchedForIdRef.current = sessionId
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err : new Error('Failed to load session'))
        setSession(null)
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false)
      }
    }
  }, [sessionId])

  /**
   * Refresh session data
   */
  const refreshSession = useCallback(async () => {
    fetchedForIdRef.current = null
    await fetchSession()
  }, [fetchSession])

  /**
   * Mark user activity (debounced server update)
   */
  const markActivity = useCallback(() => {
    if (!sessionId || !session) return

    const now = Date.now()

    // Debounce: only update server if enough time has passed
    if (now - lastActivityUpdateRef.current < ACTIVITY_UPDATE_DEBOUNCE_MS) {
      return
    }

    lastActivityUpdateRef.current = now

    // Update server in background (don't await)
    updateSessionActivity(sessionId).then((result) => {
      if (result.success && mountedRef.current && session) {
        // Update local session's lastActivityAt
        setSession((prev) =>
          prev
            ? {
                ...prev,
                lastActivityAt: new Date().toISOString(),
              }
            : null
        )
      }
    })
  }, [sessionId, session])

  /**
   * Create a new session
   */
  const handleCreateSession = useCallback(
    async (input: CreateCoCreationSessionInput) => {
      if (!authUser) {
        return { success: false, error: 'You must be signed in to create a session' }
      }

      if (isSubmittingRef.current) {
        return { success: false, error: 'A session is already being created' }
      }

      isSubmittingRef.current = true

      if (mountedRef.current) {
        setLoading(true)
        setError(null)
      }

      try {
        const result = await createSession(input)

        if (result.success && result.session && mountedRef.current) {
          setSession(result.session)
          fetchedForIdRef.current = result.session.id
        }

        return result
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to create session')

        if (mountedRef.current) {
          setError(error)
        }

        return { success: false, error: error.message }
      } finally {
        isSubmittingRef.current = false
        if (mountedRef.current) {
          setLoading(false)
        }
      }
    },
    [authUser]
  )

  /**
   * Pause the current session
   */
  const handlePauseSession = useCallback(async () => {
    if (!sessionId) {
      return { success: false, error: 'No session to pause' }
    }

    try {
      const result = await pauseCoCreationSession(sessionId)

      if (result.success && result.session && mountedRef.current) {
        setSession(result.session)
      }

      return { success: result.success, error: result.error }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to pause session')
      return { success: false, error: error.message }
    }
  }, [sessionId])

  /**
   * Resume a paused session
   */
  const handleResumeSession = useCallback(async () => {
    if (!sessionId) {
      return { success: false, error: 'No session to resume' }
    }

    try {
      const result = await resumeCoCreationSession(sessionId)

      if (result.success && result.session && mountedRef.current) {
        setSession(result.session)
        // Reset activity tracking
        lastActivityUpdateRef.current = Date.now()
      }

      return { success: result.success, error: result.error }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to resume session')
      return { success: false, error: error.message }
    }
  }, [sessionId])

  /**
   * Record a contribution
   */
  const handleRecordContribution = useCallback(
    async (input: {
      contributor: SessionContributor
      action: ContributionAction
      termId?: string
      details?: Record<string, unknown>
    }) => {
      if (!sessionId) {
        return { success: false, error: 'No session to contribute to' }
      }

      try {
        const result = await recordSessionContribution({
          sessionId,
          ...input,
        })

        if (result.success && result.session && mountedRef.current) {
          setSession(result.session)
          // Update activity tracking
          lastActivityUpdateRef.current = Date.now()
        }

        return { success: result.success, error: result.error }
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to record contribution')
        return { success: false, error: error.message }
      }
    },
    [sessionId]
  )

  /**
   * Complete the session
   */
  const handleCompleteSession = useCallback(async () => {
    if (!sessionId) {
      return { success: false, error: 'No session to complete' }
    }

    try {
      const result = await completeCoCreationSession(sessionId)

      if (result.success && result.session && mountedRef.current) {
        setSession(result.session)
      }

      return { success: result.success, error: result.error }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to complete session')
      return { success: false, error: error.message }
    }
  }, [sessionId])

  // Track mounted state
  useEffect(() => {
    mountedRef.current = true

    return () => {
      mountedRef.current = false
      // Clear any pending activity timeout
      if (activityTimeoutRef.current) {
        clearInterval(activityTimeoutRef.current)
      }
    }
  }, [])

  // Fetch session when ID changes
  useEffect(() => {
    if (!sessionId) {
      if (mountedRef.current) {
        setSession(null)
        setLoading(false)
      }
      fetchedForIdRef.current = null
      return
    }

    // Already fetched for this ID
    if (fetchedForIdRef.current === sessionId) {
      return
    }

    fetchSession()
  }, [sessionId, fetchSession])

  // Timeout warning check (AC #6)
  useEffect(() => {
    if (!session || !isSessionActive(session)) {
      setTimeoutWarning({
        show: false,
        remainingFormatted: '5:00',
        remainingMs: SESSION_TIMEOUT_CONSTANTS.INACTIVITY_TIMEOUT_MS - SESSION_TIMEOUT_CONSTANTS.INACTIVITY_WARNING_MS,
      })
      return
    }

    // Set up interval to check timeout
    const checkTimeout = () => {
      if (!mountedRef.current || !session) return

      const showWarning = shouldShowTimeoutWarning(session)
      const remainingMs = getTimeUntilTimeout(session)
      const remainingFormatted = formatTimeRemaining(remainingMs)

      setTimeoutWarning({
        show: showWarning,
        remainingFormatted,
        remainingMs,
      })
    }

    // Initial check
    checkTimeout()

    // Set up interval
    activityTimeoutRef.current = setInterval(checkTimeout, TIMEOUT_CHECK_INTERVAL_MS)

    return () => {
      if (activityTimeoutRef.current) {
        clearInterval(activityTimeoutRef.current)
      }
    }
  }, [session])

  // Activity tracking on user interaction
  useEffect(() => {
    if (!session || session.status !== 'active') {
      return
    }

    const handleActivity = () => {
      markActivity()
    }

    // Track various activity events
    window.addEventListener('mousemove', handleActivity, { passive: true })
    window.addEventListener('keydown', handleActivity, { passive: true })
    window.addEventListener('click', handleActivity, { passive: true })
    window.addEventListener('scroll', handleActivity, { passive: true })
    window.addEventListener('touchstart', handleActivity, { passive: true })

    return () => {
      window.removeEventListener('mousemove', handleActivity)
      window.removeEventListener('keydown', handleActivity)
      window.removeEventListener('click', handleActivity)
      window.removeEventListener('scroll', handleActivity)
      window.removeEventListener('touchstart', handleActivity)
    }
  }, [session, markActivity])

  // Compute isActive
  const isActive = useMemo(() => {
    return session !== null && isSessionActive(session)
  }, [session])

  return {
    session,
    loading,
    error,
    isActive,
    createSession: handleCreateSession,
    pauseSession: handlePauseSession,
    resumeSession: handleResumeSession,
    recordContribution: handleRecordContribution,
    completeSession: handleCompleteSession,
    timeoutWarning,
    refreshSession,
    clearError,
    markActivity,
  }
}
