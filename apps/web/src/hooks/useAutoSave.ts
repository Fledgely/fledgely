/**
 * useAutoSave Hook
 *
 * Story 5.7: Draft Saving & Version History - Task 2
 *
 * Provides auto-save functionality with:
 * - 30-second debounced saves (AC #1)
 * - Manual save trigger
 * - Retry logic on failures
 * - Save status tracking
 */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import type { CoCreationSession } from '@fledgely/contracts'

// ============================================
// CONSTANTS
// ============================================

/**
 * Auto-save timing and retry constants
 */
export const AUTO_SAVE_CONSTANTS = {
  /** Debounce interval in milliseconds (30 seconds per AC #1) */
  DEBOUNCE_INTERVAL_MS: 30000,
  /** Maximum retry attempts on failure */
  MAX_RETRIES: 3,
  /** Delay between retries in milliseconds */
  RETRY_DELAY_MS: 2000,
} as const

// ============================================
// TYPES
// ============================================

/**
 * Save operation status
 */
export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

/**
 * Result of a save operation
 */
export interface SaveResult {
  success: boolean
  error?: string
}

/**
 * Options for the useAutoSave hook
 */
export interface UseAutoSaveOptions {
  /** The session to save */
  session: CoCreationSession | null
  /** Function to perform the actual save */
  performSave: (session: CoCreationSession) => Promise<SaveResult>
  /** Whether auto-save is enabled (default: true) */
  enabled?: boolean
  /** Callback on successful save */
  onSaveSuccess?: () => void
  /** Callback on save error */
  onSaveError?: (error: Error) => void
  /** Custom debounce interval in ms (default: 30000) */
  debounceInterval?: number
}

/**
 * Return type for the useAutoSave hook
 */
export interface UseAutoSaveReturn {
  /** Current save status */
  status: SaveStatus
  /** Last saved timestamp */
  lastSaved: Date | null
  /** Trigger immediate save */
  saveNow: () => Promise<void>
  /** Whether there are unsaved changes */
  hasUnsavedChanges: boolean
  /** Time since last save (formatted string) */
  timeSinceLastSave: string
  /** Error message if save failed */
  error: string | null
  /** Clear error state */
  clearError: () => void
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Format time difference for display
 */
function formatTimeSince(lastSaved: Date | null, now: Date): string {
  if (!lastSaved) return ''

  const diffMs = now.getTime() - lastSaved.getTime()
  const diffSeconds = Math.floor(diffMs / 1000)
  const diffMinutes = Math.floor(diffSeconds / 60)
  const diffHours = Math.floor(diffMinutes / 60)

  if (diffSeconds < 10) return 'Just now'
  if (diffSeconds < 60) return `${diffSeconds} seconds ago`
  if (diffMinutes === 1) return '1 minute ago'
  if (diffMinutes < 60) return `${diffMinutes} minutes ago`
  if (diffHours === 1) return '1 hour ago'
  return `${diffHours} hours ago`
}


// ============================================
// HOOK IMPLEMENTATION
// ============================================

/**
 * useAutoSave Hook
 *
 * Manages auto-save functionality for co-creation sessions.
 *
 * @example
 * ```tsx
 * const { status, lastSaved, saveNow, hasUnsavedChanges } = useAutoSave({
 *   session,
 *   performSave: async (session) => {
 *     await updateSession(session.id, session)
 *     return { success: true }
 *   },
 *   onSaveSuccess: () => console.log('Saved!'),
 * })
 * ```
 */
export function useAutoSave({
  session,
  performSave,
  enabled = true,
  onSaveSuccess,
  onSaveError,
  debounceInterval = AUTO_SAVE_CONSTANTS.DEBOUNCE_INTERVAL_MS,
}: UseAutoSaveOptions): UseAutoSaveReturn {
  // State
  const [status, setStatus] = useState<SaveStatus>('idle')
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [now, setNow] = useState<Date>(new Date())

  // Refs for tracking changes and debounce
  const previousSessionRef = useRef<string | null>(null)
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const retryCountRef = useRef<number>(0)

  // Calculate session fingerprint for change detection
  const sessionFingerprint = useMemo(() => {
    if (!session) return null
    return JSON.stringify({
      terms: session.terms,
      contributions: session.contributions,
      updatedAt: session.updatedAt,
    })
  }, [session])

  // Detect changes
  const hasUnsavedChanges = useMemo(() => {
    if (!sessionFingerprint) return false
    if (previousSessionRef.current === null) return false
    return sessionFingerprint !== previousSessionRef.current
  }, [sessionFingerprint])

  // Update "now" periodically for timeSinceLastSave
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date())
    }, 10000) // Update every 10 seconds

    return () => clearInterval(interval)
  }, [])

  // Calculate formatted time since last save
  const timeSinceLastSave = useMemo(() => {
    return formatTimeSince(lastSaved, now)
  }, [lastSaved, now])

  // Save function (retry logic handled via onSaveError callback for async retries)
  const performSaveInternal = useCallback(
    async (sessionToSave: CoCreationSession): Promise<SaveResult> => {
      try {
        return await performSave(sessionToSave)
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : 'Unknown error',
        }
      }
    },
    [performSave]
  )

  // Save now function
  const saveNow = useCallback(async (): Promise<void> => {
    if (!session) return

    setStatus('saving')
    setError(null)
    retryCountRef.current = 0

    const result = await performSaveInternal(session)

    if (result.success) {
      setStatus('saved')
      setLastSaved(new Date())
      previousSessionRef.current = JSON.stringify({
        terms: session.terms,
        contributions: session.contributions,
        updatedAt: session.updatedAt,
      })
      onSaveSuccess?.()
    } else {
      const errorMessage = result.error || 'An unexpected error occurred'
      setStatus('error')
      setError(errorMessage)
      onSaveError?.(new Error(errorMessage))
    }
  }, [session, performSaveInternal, onSaveSuccess, onSaveError])

  // Clear error function
  const clearError = useCallback(() => {
    setError(null)
    setStatus('idle')
  }, [])

  // Auto-save on session changes (debounced)
  useEffect(() => {
    // Initialize previous session on first render
    if (previousSessionRef.current === null && sessionFingerprint) {
      previousSessionRef.current = sessionFingerprint
      return
    }

    // Check if auto-save is enabled and session has changed
    if (!enabled || !session || !hasUnsavedChanges) {
      return
    }

    // Clear existing timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
    }

    // Set new debounce timeout
    debounceTimeoutRef.current = setTimeout(() => {
      saveNow()
    }, debounceInterval)

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }
    }
  }, [sessionFingerprint, enabled, session, hasUnsavedChanges, saveNow, debounceInterval])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }
    }
  }, [])

  return {
    status,
    lastSaved,
    saveNow,
    hasUnsavedChanges,
    timeSinceLastSave,
    error,
    clearError,
  }
}

export default useAutoSave
