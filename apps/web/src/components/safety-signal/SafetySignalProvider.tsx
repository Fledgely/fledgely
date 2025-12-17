'use client'

/**
 * SafetySignalProvider
 *
 * Story 7.5.1: Hidden Safety Signal Access - Task 4
 *
 * Context provider that enables safety signal detection throughout the app.
 * Integrates with useSafetySignal hook and manages global keyboard shortcuts.
 *
 * CRITICAL SAFETY REQUIREMENTS:
 * - No visual feedback during gesture detection (AC3)
 * - Silent confirmation only after successful signal (discrete)
 * - Works on all screens where children have access
 *
 * CRITICAL INVARIANT (INV-002): Safety signals NEVER visible to family.
 */

import React, { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react'
import {
  useSafetySignal,
  useSafetyKeyboardShortcut,
  type UseSafetySignalReturn,
  type SignalTriggeredCallback,
} from '../../hooks/useSafetySignal'
import type { TriggerSafetySignalResponse, GestureConfig } from '@fledgely/contracts'

// ============================================================================
// Types
// ============================================================================

/**
 * Safety signal context value
 */
interface SafetySignalContextValue {
  /**
   * Handle logo tap for signal detection
   * Connect this to any tappable logo element
   */
  onLogoTap: () => void

  /**
   * Whether a signal was recently triggered
   * Use for discrete confirmation display
   */
  signalTriggered: boolean

  /**
   * Whether the signal was queued offline
   * Used to show appropriate confirmation message
   */
  isOffline: boolean

  /**
   * Register callback for signal events
   */
  onSignalTriggered: (callback: SignalTriggeredCallback) => () => void

  /**
   * Whether safety signal is enabled
   */
  enabled: boolean
}

/**
 * SafetySignalProvider props
 */
interface SafetySignalProviderProps {
  /** Child ID for signal attribution */
  childId: string
  /** Child components */
  children: ReactNode
  /** Custom gesture configuration */
  gestureConfig?: GestureConfig
  /** Enable keyboard shortcuts (default: true) */
  enableKeyboardShortcut?: boolean
  /** Whether safety signal is enabled (default: true) */
  enabled?: boolean
  /** Callback when signal is triggered */
  onSignalTriggered?: (response: TriggerSafetySignalResponse) => void
}

// ============================================================================
// Context
// ============================================================================

const SafetySignalContext = createContext<SafetySignalContextValue | null>(null)

// ============================================================================
// Provider
// ============================================================================

/**
 * SafetySignalProvider
 *
 * Wraps application sections to enable safety signal detection.
 * Should be placed high in the component tree for child-accessible areas.
 *
 * @example
 * ```tsx
 * function ChildDashboard({ child }: { child: Child }) {
 *   return (
 *     <SafetySignalProvider
 *       childId={child.id}
 *       onSignalTriggered={(response) => {
 *         // Optional: Log for monitoring (NOT to family audit trail)
 *       }}
 *     >
 *       <DashboardContent />
 *     </SafetySignalProvider>
 *   )
 * }
 * ```
 */
export function SafetySignalProvider({
  childId,
  children,
  gestureConfig,
  enableKeyboardShortcut = true,
  enabled = true,
  onSignalTriggered: onSignalTriggeredProp,
}: SafetySignalProviderProps) {
  // Initialize the safety signal hook
  const {
    onTap,
    onKeyboardShortcut,
    onSignalTriggered,
    signalTriggered,
    isOffline,
  }: UseSafetySignalReturn = useSafetySignal({
    childId,
    deviceType: 'web',
    gestureConfig,
    enabled,
  })

  // Set up keyboard shortcut detection
  useSafetyKeyboardShortcut({
    onShortcutDetected: onKeyboardShortcut,
    enabled: enabled && enableKeyboardShortcut,
  })

  // Register parent callback if provided
  useEffect(() => {
    if (!onSignalTriggeredProp) return

    return onSignalTriggered(onSignalTriggeredProp)
  }, [onSignalTriggered, onSignalTriggeredProp])

  // Memoize context value
  const contextValue = useMemo<SafetySignalContextValue>(
    () => ({
      onLogoTap: onTap,
      signalTriggered,
      isOffline,
      onSignalTriggered,
      enabled,
    }),
    [onTap, signalTriggered, isOffline, onSignalTriggered, enabled]
  )

  return (
    <SafetySignalContext.Provider value={contextValue}>{children}</SafetySignalContext.Provider>
  )
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Hook to access safety signal context
 *
 * @throws Error if used outside SafetySignalProvider
 *
 * @example
 * ```tsx
 * function Logo() {
 *   const { onLogoTap } = useSafetySignalContext()
 *
 *   return (
 *     <button onClick={onLogoTap} aria-label="Fledgely Logo">
 *       <LogoIcon />
 *     </button>
 *   )
 * }
 * ```
 */
export function useSafetySignalContext(): SafetySignalContextValue {
  const context = useContext(SafetySignalContext)

  if (!context) {
    throw new Error('useSafetySignalContext must be used within a SafetySignalProvider')
  }

  return context
}

/**
 * Optional hook that returns null if outside provider
 *
 * Useful for components that may be used both inside and outside
 * the safety signal context.
 */
export function useSafetySignalContextOptional(): SafetySignalContextValue | null {
  return useContext(SafetySignalContext)
}

// ============================================================================
// Export
// ============================================================================

export default SafetySignalProvider
