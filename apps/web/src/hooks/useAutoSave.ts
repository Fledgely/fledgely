/**
 * Auto-Save Hook.
 *
 * Story 5.7: Draft Saving & Version History - AC1, AC2
 *
 * Manages automatic saving of agreement drafts with a 30-second interval.
 * Tracks dirty state and provides manual save capability.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { AUTO_SAVE_INTERVAL_MS } from '@fledgely/shared/contracts'

export type SaveStatus = 'saved' | 'saving' | 'unsaved' | 'error'

interface UseAutoSaveOptions<T> {
  /** Data to save */
  data: T
  /** Save function that persists data */
  onSave: (data: T) => Promise<void>
  /** Enable/disable auto-save */
  enabled?: boolean
  /** Custom interval in ms (default: 30000) */
  intervalMs?: number
  /** Callback when save completes */
  onSaveComplete?: () => void
  /** Callback when save fails */
  onSaveError?: (error: Error) => void
}

interface UseAutoSaveReturn {
  /** Current save status */
  status: SaveStatus
  /** Whether there are unsaved changes */
  isDirty: boolean
  /** Last successful save timestamp */
  lastSavedAt: Date | null
  /** Trigger manual save */
  save: () => Promise<void>
  /** Mark data as changed (dirty) */
  markDirty: () => void
  /** Reset dirty state without saving */
  markClean: () => void
}

/**
 * Hook for auto-saving data at regular intervals.
 *
 * @param options Configuration options
 * @returns Save state and controls
 *
 * @example
 * ```tsx
 * const { status, isDirty, save, markDirty } = useAutoSave({
 *   data: terms,
 *   onSave: async (data) => await saveDraft(data),
 *   enabled: true,
 * })
 *
 * // When terms change
 * markDirty()
 *
 * // For manual save
 * await save()
 * ```
 */
export function useAutoSave<T>(options: UseAutoSaveOptions<T>): UseAutoSaveReturn {
  const {
    data,
    onSave,
    enabled = true,
    intervalMs = AUTO_SAVE_INTERVAL_MS,
    onSaveComplete,
    onSaveError,
  } = options

  const [status, setStatus] = useState<SaveStatus>('saved')
  const [isDirty, setIsDirty] = useState(false)
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)

  // Store latest data in ref to avoid stale closures
  const dataRef = useRef(data)
  dataRef.current = data

  // Store callbacks in refs to avoid triggering effect on every render
  const onSaveRef = useRef(onSave)
  onSaveRef.current = onSave

  const onSaveCompleteRef = useRef(onSaveComplete)
  onSaveCompleteRef.current = onSaveComplete

  const onSaveErrorRef = useRef(onSaveError)
  onSaveErrorRef.current = onSaveError

  /**
   * Perform the save operation.
   */
  const performSave = useCallback(async () => {
    if (!isDirty) return

    setStatus('saving')

    try {
      await onSaveRef.current(dataRef.current)
      setStatus('saved')
      setIsDirty(false)
      setLastSavedAt(new Date())
      onSaveCompleteRef.current?.()
    } catch (error) {
      setStatus('error')
      onSaveErrorRef.current?.(error instanceof Error ? error : new Error('Save failed'))
    }
  }, [isDirty])

  /**
   * Trigger manual save.
   */
  const save = useCallback(async () => {
    await performSave()
  }, [performSave])

  /**
   * Mark data as dirty (unsaved changes).
   */
  const markDirty = useCallback(() => {
    setIsDirty(true)
    if (status === 'saved') {
      setStatus('unsaved')
    }
  }, [status])

  /**
   * Mark data as clean without saving.
   */
  const markClean = useCallback(() => {
    setIsDirty(false)
    setStatus('saved')
  }, [])

  /**
   * Set up auto-save interval.
   */
  useEffect(() => {
    if (!enabled) return

    const intervalId = setInterval(() => {
      if (isDirty) {
        performSave()
      }
    }, intervalMs)

    return () => {
      clearInterval(intervalId)
    }
  }, [enabled, intervalMs, isDirty, performSave])

  return {
    status,
    isDirty,
    lastSavedAt,
    save,
    markDirty,
    markClean,
  }
}
