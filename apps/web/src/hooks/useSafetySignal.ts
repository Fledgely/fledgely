/**
 * useSafetySignal Hook - Story 7.5.1 Task 4
 *
 * Hook for triggering and managing safety signals.
 *
 * AC2: No visible UI change - This hook NEVER exposes error/success states
 * AC3: Works offline - Queues signals when offline, syncs when online
 *
 * CRITICAL SAFETY: This hook NEVER causes visible UI feedback.
 * All operations are silent to protect the child.
 */

import { useState, useCallback, useRef } from 'react'
import {
  createSafetySignalWithQueue,
  processOfflineQueue,
  getOfflineQueueCount,
  type TriggerMethod,
  type SignalPlatform,
} from '@fledgely/shared'

/** Options for useSafetySignal hook */
export interface UseSafetySignalOptions {
  /** Child ID triggering the signal */
  childId: string
  /** Family ID for routing (NOT for family visibility) */
  familyId: string
  /** Platform where signal is triggered */
  platform: SignalPlatform
  /** Optional device ID */
  deviceId?: string
}

/** Return type for useSafetySignal hook */
export interface UseSafetySignalReturn {
  /** Trigger a safety signal - NEVER causes visible UI changes */
  triggerSignal: (method: TriggerMethod) => Promise<void>
  /** Whether a signal operation is in progress */
  isPending: boolean
  /** Number of signals in offline queue for this child */
  offlineQueueCount: number
  /** Process offline queue when connectivity is restored */
  processQueue: () => Promise<void>
}

/**
 * Hook for triggering safety signals.
 *
 * CRITICAL SAFETY DESIGN:
 * - NEVER exposes error state (to prevent UI changes)
 * - NEVER exposes success state (to prevent UI changes)
 * - All failures are silent (logged internally only)
 * - Works offline by queuing signals locally
 */
export function useSafetySignal(options: UseSafetySignalOptions): UseSafetySignalReturn {
  const { childId, familyId, platform, deviceId } = options

  const [isPending, setIsPending] = useState(false)
  const [offlineQueueCount, setOfflineQueueCount] = useState(() => getOfflineQueueCount(childId))

  // Use refs to maintain stable function references
  const childIdRef = useRef(childId)
  const familyIdRef = useRef(familyId)
  const platformRef = useRef(platform)
  const deviceIdRef = useRef(deviceId)

  // Update refs when props change
  childIdRef.current = childId
  familyIdRef.current = familyId
  platformRef.current = platform
  deviceIdRef.current = deviceId

  /**
   * Trigger a safety signal.
   *
   * CRITICAL: This function NEVER throws or exposes errors.
   * All operations are silent to protect the child.
   */
  const triggerSignal = useCallback(async (method: TriggerMethod): Promise<void> => {
    setIsPending(true)

    try {
      const isOffline = !navigator.onLine

      // Create signal (automatically queues if offline)
      createSafetySignalWithQueue(
        childIdRef.current,
        familyIdRef.current,
        method,
        platformRef.current,
        isOffline,
        deviceIdRef.current ?? null
      )

      // Update offline queue count
      setOfflineQueueCount(getOfflineQueueCount(childIdRef.current))
    } catch (error) {
      // CRITICAL: Silently catch errors - NEVER expose to UI
      // Log internally for debugging (would go to admin audit in production)
      console.error('Safety signal error (silent):', error)
    } finally {
      setIsPending(false)
    }
  }, [])

  /**
   * Process offline queue when connectivity is restored.
   *
   * CRITICAL: This function NEVER throws or exposes errors.
   */
  const processQueue = useCallback(async (): Promise<void> => {
    // Only process if online
    if (!navigator.onLine) {
      return
    }

    try {
      processOfflineQueue(childIdRef.current)

      // Update offline queue count
      setOfflineQueueCount(getOfflineQueueCount(childIdRef.current))
    } catch (error) {
      // CRITICAL: Silently catch errors - NEVER expose to UI
      console.error('Queue processing error (silent):', error)
    }
  }, [])

  return {
    triggerSignal,
    isPending,
    offlineQueueCount,
    processQueue,
  }
}
