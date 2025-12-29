/**
 * Session Timeout Hook.
 *
 * Story 5.1: Co-Creation Session Initiation - AC6
 *
 * Tracks user activity and manages session timeout warnings.
 * Shows warning at 25 minutes of inactivity.
 * Auto-pauses session at 30 minutes of inactivity.
 */

import { useState, useEffect, useCallback, useRef } from 'react'

interface UseSessionTimeoutOptions {
  /** Timeout threshold in milliseconds (default: 30 minutes) */
  timeoutMs?: number
  /** Warning threshold in milliseconds before timeout (default: 5 minutes before timeout) */
  warningMs?: number
  /** Callback when timeout warning should show */
  onWarning?: () => void
  /** Callback when session should auto-pause */
  onTimeout?: () => void
  /** Whether timeout tracking is enabled */
  enabled?: boolean
}

const DEFAULT_TIMEOUT_MS = 30 * 60 * 1000 // 30 minutes
const DEFAULT_WARNING_MS = 5 * 60 * 1000 // 5 minutes before timeout

export function useSessionTimeout(options: UseSessionTimeoutOptions = {}) {
  const {
    timeoutMs = DEFAULT_TIMEOUT_MS,
    warningMs = DEFAULT_WARNING_MS,
    onWarning,
    onTimeout,
    enabled = true,
  } = options

  const [isWarningVisible, setIsWarningVisible] = useState(false)
  const [minutesRemaining, setMinutesRemaining] = useState(5)
  const lastActivityRef = useRef<number>(Date.now())
  const warningShownRef = useRef(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  /**
   * Reset the activity timer.
   */
  const resetActivity = useCallback(() => {
    lastActivityRef.current = Date.now()
    warningShownRef.current = false
    setIsWarningVisible(false)
  }, [])

  /**
   * Handle user extending the session (dismissing warning).
   */
  const extendSession = useCallback(() => {
    resetActivity()
  }, [resetActivity])

  /**
   * Check activity and trigger warnings/timeout.
   */
  const checkActivity = useCallback(() => {
    const now = Date.now()
    const timeSinceActivity = now - lastActivityRef.current
    const timeUntilTimeout = timeoutMs - timeSinceActivity
    const warningThreshold = timeoutMs - warningMs

    // Calculate minutes remaining
    const remaining = Math.ceil(timeUntilTimeout / 60000)
    setMinutesRemaining(Math.max(0, remaining))

    // Check if we should show warning
    if (timeSinceActivity >= warningThreshold && !warningShownRef.current) {
      warningShownRef.current = true
      setIsWarningVisible(true)
      onWarning?.()
    }

    // Check if session should timeout
    if (timeSinceActivity >= timeoutMs) {
      setIsWarningVisible(false)
      onTimeout?.()
    }
  }, [timeoutMs, warningMs, onWarning, onTimeout])

  /**
   * Track user activity (clicks, keystrokes, scroll).
   */
  useEffect(() => {
    if (!enabled) {
      return
    }

    const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart']

    const handleActivity = () => {
      if (!isWarningVisible) {
        lastActivityRef.current = Date.now()
      }
    }

    activityEvents.forEach((event) => {
      window.addEventListener(event, handleActivity, { passive: true })
    })

    return () => {
      activityEvents.forEach((event) => {
        window.removeEventListener(event, handleActivity)
      })
    }
  }, [enabled, isWarningVisible])

  /**
   * Set up the activity check interval.
   */
  useEffect(() => {
    if (!enabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      return
    }

    // Check activity every minute
    intervalRef.current = setInterval(checkActivity, 60000)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [enabled, checkActivity])

  /**
   * Reset on mount.
   */
  useEffect(() => {
    if (enabled) {
      resetActivity()
    }
  }, [enabled, resetActivity])

  return {
    isWarningVisible,
    minutesRemaining,
    resetActivity,
    extendSession,
  }
}
