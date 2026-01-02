/**
 * SafetySignalGestureDetector Component - Story 7.5.1 Task 3
 *
 * Detects hidden safety gestures without any visible feedback.
 *
 * AC1: Hidden gesture/code available (logo tap 5x, Ctrl+Shift+H)
 * AC2: No visible UI change on trigger
 * AC4: Cannot be accidentally triggered
 * AC5: Consistent across platforms
 *
 * CRITICAL SAFETY: This component NEVER provides visible feedback.
 * The gesture must be invisible to observers.
 */

import { useEffect, useRef, useCallback, type ReactNode, type RefObject } from 'react'
import { LOGO_TAP_COUNT, LOGO_TAP_WINDOW_MS } from '@fledgely/shared/contracts'

/** Trigger method for signal */
export type TriggerMethod = 'logo_tap' | 'keyboard_shortcut'

/** Props for SafetySignalGestureDetector */
export interface SafetySignalGestureDetectorProps {
  /** Child content to wrap */
  children: ReactNode
  /** Reference to the logo element to attach click listener */
  logoRef: RefObject<HTMLElement>
  /** Callback when signal is triggered - MUST NOT cause visible UI changes */
  onSignalTriggered: (method: TriggerMethod) => void
  /** Disable gesture detection (for testing or specific states) */
  disabled?: boolean
}

/** Debounce period to prevent double-triggering (5 seconds) */
const DEBOUNCE_MS = 5000

/**
 * Component that detects hidden safety gestures.
 *
 * Detects:
 * 1. Logo tap 5x within 3 seconds
 * 2. Keyboard shortcut Ctrl+Shift+H
 *
 * NEVER modifies the DOM or shows any visible indication of detection.
 */
export default function SafetySignalGestureDetector({
  children,
  logoRef,
  onSignalTriggered,
  disabled = false,
}: SafetySignalGestureDetectorProps): ReactNode {
  // Track tap timestamps for timing window
  const tapTimestampsRef = useRef<number[]>([])
  // Track last trigger time for debouncing
  const lastTriggerRef = useRef<number>(0)

  /**
   * Check if we're within debounce period
   */
  const isDebouncing = useCallback((): boolean => {
    return Date.now() - lastTriggerRef.current < DEBOUNCE_MS
  }, [])

  /**
   * Trigger the signal with debounce protection
   */
  const triggerSignal = useCallback(
    (method: TriggerMethod): void => {
      if (disabled || isDebouncing()) {
        return
      }

      lastTriggerRef.current = Date.now()
      tapTimestampsRef.current = [] // Reset taps after trigger

      try {
        onSignalTriggered(method)
      } catch (error) {
        // Silently catch errors - NEVER let errors cause visible changes
        console.error('Safety signal handler error:', error)
      }
    },
    [disabled, isDebouncing, onSignalTriggered]
  )

  /**
   * Handle logo click - track taps within time window
   */
  const handleLogoClick = useCallback((): void => {
    if (disabled || isDebouncing()) {
      return
    }

    const now = Date.now()

    // Filter out taps outside the time window
    tapTimestampsRef.current = tapTimestampsRef.current.filter(
      (timestamp) => now - timestamp < LOGO_TAP_WINDOW_MS
    )

    // Add current tap
    tapTimestampsRef.current.push(now)

    // Check if we have enough taps
    if (tapTimestampsRef.current.length >= LOGO_TAP_COUNT) {
      triggerSignal('logo_tap')
    }
  }, [disabled, isDebouncing, triggerSignal])

  /**
   * Handle keyboard shortcut (Ctrl+Shift+H)
   */
  const handleKeyDown = useCallback(
    (event: KeyboardEvent): void => {
      if (disabled || isDebouncing()) {
        return
      }

      // Check for Ctrl+Shift+H
      if (
        event.ctrlKey &&
        event.shiftKey &&
        !event.altKey &&
        !event.metaKey &&
        (event.key === 'h' || event.key === 'H')
      ) {
        triggerSignal('keyboard_shortcut')
      }
    },
    [disabled, isDebouncing, triggerSignal]
  )

  // Set up logo click listener
  useEffect(() => {
    const logoElement = logoRef.current
    if (!logoElement) {
      return
    }

    logoElement.addEventListener('click', handleLogoClick)

    return () => {
      logoElement.removeEventListener('click', handleLogoClick)
    }
  }, [logoRef, handleLogoClick])

  // Set up global keyboard listener
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleKeyDown])

  // CRITICAL: Return children without any wrapper that could cause visual changes
  // eslint-disable-next-line react/jsx-no-useless-fragment
  return <>{children}</>
}
