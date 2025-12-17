'use client'

/**
 * useSafetySignal Hook
 *
 * Story 7.5.1: Hidden Safety Signal Access - Task 2
 *
 * React hook for detecting safety signal gestures (logo tap, keyboard shortcut).
 * Provides gesture detection and signal triggering functionality.
 *
 * CRITICAL SAFETY REQUIREMENTS:
 * - Gesture detection happens SYNCHRONOUSLY before any logging
 * - No visual feedback during gesture (AC3)
 * - Accidental triggers prevented via debouncing (AC5)
 * - Works offline by queueing signals (AC4)
 *
 * CRITICAL INVARIANT (INV-002): Safety signals NEVER visible to family.
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import {
  DEFAULT_GESTURE_CONFIG,
  createInitialGestureState,
  resetGestureState,
  incrementGestureState,
  isGestureComplete,
  isGestureTimedOut,
  generateQueueId,
  SAFETY_SIGNAL_CONSTANTS,
  type GestureType,
  type GestureDetectionState,
  type GestureConfig,
  type SignalDeviceType,
  type TriggerSafetySignalResponse,
} from '@fledgely/contracts'

// ============================================================================
// Types
// ============================================================================

/**
 * Safety signal hook return type
 */
export interface UseSafetySignalReturn {
  /**
   * Handle a tap event on the logo/trigger element
   * Call this on every tap - the hook tracks the gesture state
   */
  onTap: () => void

  /**
   * Handle a keyboard shortcut event
   * Call this when the safety keyboard shortcut is pressed
   */
  onKeyboardShortcut: () => void

  /**
   * Register a callback for when a signal is triggered
   * Callback receives the queue ID (NOT the server signal ID)
   */
  onSignalTriggered: (callback: SignalTriggeredCallback) => () => void

  /**
   * Whether a signal was recently triggered (for discrete confirmation)
   * Auto-resets after CONFIRMATION_DISPLAY_MS
   */
  signalTriggered: boolean

  /**
   * Whether the last triggered signal was queued for offline delivery
   * True when signal was queued but not sent immediately
   */
  isOffline: boolean

  /**
   * Whether the gesture sequence is in progress
   * (For internal tracking - should NOT be displayed to user)
   */
  gestureInProgress: boolean

  /**
   * Current gesture progress (0 to required count)
   * (For internal tracking - should NOT be displayed to user)
   */
  gestureProgress: number

  /**
   * Reset gesture detection state manually
   */
  resetGesture: () => void
}

/**
 * Callback type for signal triggered events
 */
export type SignalTriggeredCallback = (response: TriggerSafetySignalResponse) => void

/**
 * Signal queue service interface (injected for testability)
 */
export interface SafetySignalQueueService {
  queueSignal: (
    childId: string,
    deviceType: SignalDeviceType,
    gestureType: GestureType
  ) => Promise<TriggerSafetySignalResponse>
}

/**
 * Hook options
 */
export interface UseSafetySignalOptions {
  /** Child ID for the signal */
  childId: string
  /** Device type (defaults to 'web') */
  deviceType?: SignalDeviceType
  /** Custom gesture configuration */
  gestureConfig?: GestureConfig
  /** Signal queue service (injected for testability) */
  queueService?: SafetySignalQueueService
  /** Whether the hook is enabled (default: true) */
  enabled?: boolean
}

// ============================================================================
// Default Queue Service
// ============================================================================

// Import the actual queue service
import { getSafetySignalQueueService } from '../services/SafetySignalQueueService'

/**
 * Default queue service using the singleton SafetySignalQueueService
 */
const defaultQueueService: SafetySignalQueueService = {
  queueSignal: async (
    childId: string,
    deviceType: SignalDeviceType,
    gestureType: GestureType
  ): Promise<TriggerSafetySignalResponse> => {
    const queueService = getSafetySignalQueueService()
    // Initialize on first use (safe to call multiple times)
    await queueService.initialize()
    return queueService.queueSignal(childId, deviceType, gestureType)
  },
}

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Hook for detecting safety signal gestures
 *
 * @example
 * ```tsx
 * function SafetySignalWrapper({ childId }: { childId: string }) {
 *   const { onTap, signalTriggered, onSignalTriggered } = useSafetySignal({
 *     childId,
 *     deviceType: 'web',
 *   })
 *
 *   useEffect(() => {
 *     onSignalTriggered((response) => {
 *       // Signal was triggered - show discrete confirmation
 *       console.log('Signal queued:', response.queueId)
 *     })
 *   }, [onSignalTriggered])
 *
 *   return (
 *     <div onClick={onTap}>
 *       <Logo />
 *     </div>
 *   )
 * }
 * ```
 */
export function useSafetySignal(options: UseSafetySignalOptions): UseSafetySignalReturn {
  const {
    childId,
    deviceType = 'web',
    gestureConfig = DEFAULT_GESTURE_CONFIG,
    queueService = defaultQueueService,
    enabled = true,
  } = options

  // Gesture state for tap detection
  const [tapState, setTapState] = useState<GestureDetectionState>(
    createInitialGestureState('tap')
  )

  // Gesture state for keyboard detection
  const [keyboardState, setKeyboardState] = useState<GestureDetectionState>(
    createInitialGestureState('keyboard')
  )

  // Signal triggered state (for confirmation display)
  const [signalTriggered, setSignalTriggered] = useState(false)

  // Offline state (whether signal was queued for offline delivery)
  const [isOffline, setIsOffline] = useState(false)

  // Callbacks ref for signal triggered events
  const callbacksRef = useRef<SignalTriggeredCallback[]>([])

  // Debounce ref to prevent accidental triggers
  const lastSignalTimeRef = useRef<number>(0)

  // Mounted ref for cleanup
  const mountedRef = useRef(true)

  // Track if we're currently processing a signal
  const processingRef = useRef(false)

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  // Auto-reset signal triggered state after confirmation display time
  useEffect(() => {
    if (signalTriggered) {
      const timer = setTimeout(() => {
        if (mountedRef.current) {
          setSignalTriggered(false)
        }
      }, SAFETY_SIGNAL_CONSTANTS.CONFIRMATION_DISPLAY_MS)

      return () => clearTimeout(timer)
    }
  }, [signalTriggered])

  /**
   * Process a completed gesture and trigger the signal
   *
   * CRITICAL: This runs synchronously before any logging
   */
  const processCompletedGesture = useCallback(
    async (gestureType: GestureType) => {
      // Prevent double-processing
      if (processingRef.current) {
        return
      }

      // Check debounce - prevent rapid re-triggering
      const now = Date.now()
      if (now - lastSignalTimeRef.current < SAFETY_SIGNAL_CONSTANTS.MIN_SIGNAL_INTERVAL_MS) {
        return
      }

      processingRef.current = true
      lastSignalTimeRef.current = now

      try {
        // Queue the signal (works offline)
        const response = await queueService.queueSignal(childId, deviceType, gestureType)

        if (mountedRef.current) {
          // Set triggered state for confirmation (AC3 - discrete)
          setSignalTriggered(true)

          // Track offline state (queued but not sent immediately)
          setIsOffline(response.queued && response.queueId !== null)

          // Notify callbacks
          for (const callback of callbacksRef.current) {
            try {
              callback(response)
            } catch {
              // Ignore callback errors - signal is already queued
            }
          }
        }
      } catch {
        // CRITICAL: Swallow errors silently - never expose signal failure to observer
        // The queue service handles retry logic internally
      } finally {
        processingRef.current = false
      }
    },
    [childId, deviceType, queueService]
  )

  /**
   * Check if a gesture sequence has timed out based on current time
   * (Different from isGestureTimedOut which checks elapsed between first and last)
   */
  const isSequenceExpired = useCallback(
    (state: GestureDetectionState, now: number): boolean => {
      if (!state.startTime || state.count === 0) {
        return false
      }
      const window =
        state.gestureType === 'tap'
          ? gestureConfig.tapWindowMs
          : gestureConfig.keyboardWindowMs
      return now - state.startTime > window
    },
    [gestureConfig]
  )

  /**
   * Handle tap event on logo/trigger element
   */
  const onTap = useCallback(() => {
    if (!enabled) {
      return
    }

    setTapState((prevState) => {
      const now = Date.now()

      // Check if timed out - reset if so (use current time vs start time)
      if (isSequenceExpired(prevState, now)) {
        const freshState = createInitialGestureState('tap')
        return incrementGestureState(freshState, now)
      }

      // Increment gesture count
      const newState = incrementGestureState(prevState, now)

      // Check if gesture is complete
      if (isGestureComplete(newState, gestureConfig)) {
        // Process the completed gesture (async, outside of setState)
        setTimeout(() => processCompletedGesture('tap'), 0)
        // Reset state
        return createInitialGestureState('tap')
      }

      return newState
    })
  }, [enabled, gestureConfig, processCompletedGesture, isSequenceExpired])

  /**
   * Handle keyboard shortcut event
   */
  const onKeyboardShortcut = useCallback(() => {
    if (!enabled) {
      return
    }

    setKeyboardState((prevState) => {
      const now = Date.now()

      // Check if timed out - reset if so (use current time vs start time)
      if (isSequenceExpired(prevState, now)) {
        const freshState = createInitialGestureState('keyboard')
        return incrementGestureState(freshState, now)
      }

      // Increment gesture count
      const newState = incrementGestureState(prevState, now)

      // Check if gesture is complete
      if (isGestureComplete(newState, gestureConfig)) {
        // Process the completed gesture (async, outside of setState)
        setTimeout(() => processCompletedGesture('keyboard'), 0)
        // Reset state
        return createInitialGestureState('keyboard')
      }

      return newState
    })
  }, [enabled, gestureConfig, processCompletedGesture, isSequenceExpired])

  /**
   * Register callback for signal triggered events
   */
  const onSignalTriggered = useCallback((callback: SignalTriggeredCallback) => {
    callbacksRef.current.push(callback)

    // Return cleanup function
    return () => {
      const index = callbacksRef.current.indexOf(callback)
      if (index !== -1) {
        callbacksRef.current.splice(index, 1)
      }
    }
  }, [])

  /**
   * Reset gesture detection state
   */
  const resetGesture = useCallback(() => {
    setTapState(createInitialGestureState('tap'))
    setKeyboardState(createInitialGestureState('keyboard'))
  }, [])

  // Calculate gesture progress for internal tracking
  const gestureProgress = Math.max(tapState.count, keyboardState.count)
  const gestureInProgress =
    (tapState.count > 0 && !isGestureTimedOut(tapState, gestureConfig)) ||
    (keyboardState.count > 0 && !isGestureTimedOut(keyboardState, gestureConfig))

  return {
    onTap,
    onKeyboardShortcut,
    onSignalTriggered,
    signalTriggered,
    isOffline,
    gestureInProgress,
    gestureProgress,
    resetGesture,
  }
}

// ============================================================================
// Keyboard Shortcut Detection Hook
// ============================================================================

/**
 * Keyboard shortcut pattern for safety signal
 *
 * Default: Shift+Ctrl+S pressed 3 times within 3 seconds
 */
export interface KeyboardShortcutConfig {
  /** Key to press (default: 's') */
  key: string
  /** Require Ctrl/Cmd modifier (default: true) */
  requireCtrl: boolean
  /** Require Shift modifier (default: true) */
  requireShift: boolean
}

const DEFAULT_KEYBOARD_CONFIG: KeyboardShortcutConfig = {
  key: 's',
  requireCtrl: true,
  requireShift: true,
}

/**
 * Hook for detecting the safety keyboard shortcut globally
 *
 * Should be used at the app level to detect keyboard shortcuts
 * anywhere in the application.
 *
 * @example
 * ```tsx
 * function App() {
 *   const { onKeyboardShortcut } = useSafetySignal({ childId: 'child-123' })
 *
 *   useSafetyKeyboardShortcut({
 *     onShortcutDetected: onKeyboardShortcut,
 *   })
 *
 *   return <AppContent />
 * }
 * ```
 */
export function useSafetyKeyboardShortcut(options: {
  onShortcutDetected: () => void
  config?: KeyboardShortcutConfig
  enabled?: boolean
}): void {
  const { onShortcutDetected, config = DEFAULT_KEYBOARD_CONFIG, enabled = true } = options

  useEffect(() => {
    if (!enabled) {
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      // Check modifiers
      if (config.requireCtrl && !event.ctrlKey && !event.metaKey) {
        return
      }
      if (config.requireShift && !event.shiftKey) {
        return
      }

      // Check key
      if (event.key.toLowerCase() !== config.key.toLowerCase()) {
        return
      }

      // Prevent default to avoid browser shortcuts
      event.preventDefault()

      // Notify callback
      onShortcutDetected()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [enabled, config, onShortcutDetected])
}
