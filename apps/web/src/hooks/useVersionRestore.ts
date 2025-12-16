/**
 * useVersionRestore Hook
 *
 * Story 5.7: Draft Saving & Version History - Task 8
 *
 * Provides version restoration functionality with:
 * - Restore from version snapshot
 * - Creation of restore contribution record
 * - Success/error state handling
 * - Undo capability (30-second window)
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import type {
  CoCreationSession,
  SessionVersion,
  SessionContribution,
  SessionContributor,
} from '@fledgely/contracts'

// ============================================
// CONSTANTS
// ============================================

/**
 * Restore flow constants
 */
export const RESTORE_CONSTANTS = {
  /** Undo window in milliseconds (30 seconds) */
  UNDO_WINDOW_MS: 30000,
} as const

// ============================================
// TYPES
// ============================================

/**
 * Restore operation status
 */
export type RestoreStatus = 'idle' | 'restoring' | 'success' | 'error'

/**
 * Result of a restore operation
 */
export interface RestoreResult {
  success: boolean
  error?: string
  /** The restored session state */
  restoredSession?: CoCreationSession
}

/**
 * Options for the useVersionRestore hook
 */
export interface UseVersionRestoreOptions {
  /** The current session */
  session: CoCreationSession | null
  /** Function to apply the restored state */
  applyRestore: (restoredSession: CoCreationSession) => Promise<RestoreResult>
  /** Current contributor performing the restore */
  contributor: SessionContributor
  /** Callback on successful restore */
  onRestoreSuccess?: (version: SessionVersion) => void
  /** Callback on restore error */
  onRestoreError?: (error: Error) => void
  /** Callback when undo is performed */
  onUndo?: () => void
}

/**
 * Return type for the useVersionRestore hook
 */
export interface UseVersionRestoreReturn {
  /** Current restore status */
  status: RestoreStatus
  /** Perform restore from a version */
  restoreVersion: (version: SessionVersion) => Promise<void>
  /** Undo the last restore (if within window) */
  undoRestore: () => Promise<void>
  /** Whether undo is currently available */
  canUndo: boolean
  /** Remaining time for undo (in seconds) */
  undoTimeRemaining: number
  /** Error message if restore failed */
  error: string | null
  /** Clear error state */
  clearError: () => void
  /** The version being restored (for UI feedback) */
  restoringVersion: SessionVersion | null
}

// ============================================
// HOOK IMPLEMENTATION
// ============================================

/**
 * useVersionRestore Hook
 *
 * Manages version restoration for co-creation sessions.
 *
 * @example
 * ```tsx
 * const { status, restoreVersion, canUndo, undoRestore } = useVersionRestore({
 *   session,
 *   applyRestore: async (restoredSession) => {
 *     await updateSession(session.id, restoredSession)
 *     return { success: true }
 *   },
 *   contributor: 'parent',
 *   onRestoreSuccess: () => toast.success('Version restored!'),
 * })
 * ```
 */
export function useVersionRestore({
  session,
  applyRestore,
  contributor,
  onRestoreSuccess,
  onRestoreError,
  onUndo,
}: UseVersionRestoreOptions): UseVersionRestoreReturn {
  // State
  const [status, setStatus] = useState<RestoreStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [canUndo, setCanUndo] = useState(false)
  const [undoTimeRemaining, setUndoTimeRemaining] = useState(0)
  const [restoringVersion, setRestoringVersion] = useState<SessionVersion | null>(null)

  // Refs for undo functionality
  const previousSessionRef = useRef<CoCreationSession | null>(null)
  const undoTimerRef = useRef<NodeJS.Timeout | null>(null)
  const undoCountdownRef = useRef<NodeJS.Timeout | null>(null)
  const restoredVersionRef = useRef<SessionVersion | null>(null)

  // Clear undo timers
  const clearUndoTimers = useCallback(() => {
    if (undoTimerRef.current) {
      clearTimeout(undoTimerRef.current)
      undoTimerRef.current = null
    }
    if (undoCountdownRef.current) {
      clearInterval(undoCountdownRef.current)
      undoCountdownRef.current = null
    }
    setCanUndo(false)
    setUndoTimeRemaining(0)
  }, [])

  // Start undo window
  const startUndoWindow = useCallback(() => {
    clearUndoTimers()

    setCanUndo(true)
    setUndoTimeRemaining(RESTORE_CONSTANTS.UNDO_WINDOW_MS / 1000)

    // Countdown timer
    undoCountdownRef.current = setInterval(() => {
      setUndoTimeRemaining((prev) => {
        if (prev <= 1) {
          clearUndoTimers()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    // Expiry timer
    undoTimerRef.current = setTimeout(() => {
      clearUndoTimers()
    }, RESTORE_CONSTANTS.UNDO_WINDOW_MS)
  }, [clearUndoTimers])

  // Restore version function
  const restoreVersion = useCallback(
    async (version: SessionVersion): Promise<void> => {
      if (!session) return

      setStatus('restoring')
      setError(null)
      setRestoringVersion(version)

      // Store previous session for undo
      previousSessionRef.current = { ...session }
      restoredVersionRef.current = version

      try {
        // Create restored session state
        const restoredSession: CoCreationSession = {
          ...session,
          terms: version.snapshot.terms,
          contributions: [
            ...session.contributions,
            {
              id: crypto.randomUUID(),
              contributor,
              action: 'session_resumed', // Using existing action type for restore
              createdAt: new Date().toISOString(),
            } as SessionContribution,
          ],
          agreementMode: version.snapshot.agreementMode,
          updatedAt: new Date().toISOString(),
          lastActivityAt: new Date().toISOString(),
        }

        const result = await applyRestore(restoredSession)

        if (result.success) {
          setStatus('success')
          onRestoreSuccess?.(version)
          startUndoWindow()
        } else {
          setStatus('error')
          setError(result.error || 'Failed to restore version')
          onRestoreError?.(new Error(result.error || 'Failed to restore version'))
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error'
        setStatus('error')
        setError(errorMessage)
        onRestoreError?.(err instanceof Error ? err : new Error(errorMessage))
      } finally {
        setRestoringVersion(null)
      }
    },
    [session, contributor, applyRestore, onRestoreSuccess, onRestoreError, startUndoWindow]
  )

  // Undo restore function
  const undoRestore = useCallback(async (): Promise<void> => {
    if (!canUndo || !previousSessionRef.current) return

    setStatus('restoring')
    clearUndoTimers()

    try {
      const result = await applyRestore(previousSessionRef.current)

      if (result.success) {
        setStatus('idle')
        previousSessionRef.current = null
        restoredVersionRef.current = null
        onUndo?.()
      } else {
        setStatus('error')
        setError(result.error || 'Failed to undo restore')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setStatus('error')
      setError(errorMessage)
    }
  }, [canUndo, applyRestore, onUndo, clearUndoTimers])

  // Clear error function
  const clearError = useCallback(() => {
    setError(null)
    setStatus('idle')
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearUndoTimers()
    }
  }, [clearUndoTimers])

  return {
    status,
    restoreVersion,
    undoRestore,
    canUndo,
    undoTimeRemaining,
    error,
    clearError,
    restoringVersion,
  }
}

export default useVersionRestore
