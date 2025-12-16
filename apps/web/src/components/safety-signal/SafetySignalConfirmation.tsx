'use client'

/**
 * SafetySignalConfirmation
 *
 * Story 7.5.1: Hidden Safety Signal Access - Task 4
 *
 * Discrete confirmation component that shows briefly after a safety signal
 * is triggered. Designed to be subtle and not draw attention from observers.
 *
 * CRITICAL SAFETY REQUIREMENTS:
 * - Must be discrete - should not draw observer attention (AC3)
 * - Brief display - appears for ~3 seconds then vanishes
 * - No sound or vibration that could alert others
 * - Styled to blend with normal UI feedback
 *
 * CRITICAL INVARIANT (INV-002): Safety signals NEVER visible to family.
 */

import React, { useEffect, useState } from 'react'
import { useSafetySignalContextOptional } from './SafetySignalProvider'
import { SAFETY_SIGNAL_CONSTANTS } from '@fledgely/contracts'

// ============================================================================
// Types
// ============================================================================

/**
 * SafetySignalConfirmation props
 */
interface SafetySignalConfirmationProps {
  /** Custom confirmation message */
  message?: string
  /** Custom CSS class */
  className?: string
  /** Position on screen */
  position?: 'top' | 'bottom' | 'top-right' | 'bottom-right'
  /** Test ID for testing */
  testId?: string
}

// ============================================================================
// Component
// ============================================================================

/**
 * SafetySignalConfirmation
 *
 * Shows a discrete confirmation when a safety signal is triggered.
 * The message is intentionally vague to prevent suspicion.
 *
 * Place this component somewhere in your layout where it can show
 * notifications without drawing undue attention.
 *
 * @example
 * ```tsx
 * function App() {
 *   return (
 *     <SafetySignalProvider childId={childId}>
 *       <MainContent />
 *       <SafetySignalConfirmation position="bottom-right" />
 *     </SafetySignalProvider>
 *   )
 * }
 * ```
 */
export function SafetySignalConfirmation({
  message = 'Saved',
  className = '',
  position = 'bottom-right',
  testId = 'safety-signal-confirmation',
}: SafetySignalConfirmationProps) {
  const safetySignal = useSafetySignalContextOptional()
  const [visible, setVisible] = useState(false)
  const [fading, setFading] = useState(false)

  // Show confirmation when signal is triggered
  useEffect(() => {
    if (safetySignal?.signalTriggered) {
      setVisible(true)
      setFading(false)

      // Start fade out before auto-hide
      const fadeTimer = setTimeout(() => {
        setFading(true)
      }, SAFETY_SIGNAL_CONSTANTS.CONFIRMATION_DISPLAY_MS - 500)

      // Hide after display time
      const hideTimer = setTimeout(() => {
        setVisible(false)
        setFading(false)
      }, SAFETY_SIGNAL_CONSTANTS.CONFIRMATION_DISPLAY_MS)

      return () => {
        clearTimeout(fadeTimer)
        clearTimeout(hideTimer)
      }
    }
  }, [safetySignal?.signalTriggered])

  // Don't render if not visible or not in context
  if (!visible) {
    return null
  }

  // Position styles
  const positionStyles = getPositionStyles(position)

  return (
    <div
      data-testid={testId}
      className={className}
      style={{
        ...positionStyles,
        // Discrete styling - looks like a normal system notification
        padding: '8px 16px',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        color: '#fff',
        borderRadius: '4px',
        fontSize: '0.875rem',
        fontWeight: 500,
        zIndex: 9999,
        pointerEvents: 'none',
        opacity: fading ? 0 : 1,
        transition: 'opacity 500ms ease-out',
        // Prevent text selection
        userSelect: 'none',
        WebkitUserSelect: 'none',
      }}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      {message}
    </div>
  )
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Get CSS position styles based on position prop
 */
function getPositionStyles(
  position: 'top' | 'bottom' | 'top-right' | 'bottom-right'
): React.CSSProperties {
  const base: React.CSSProperties = {
    position: 'fixed',
  }

  switch (position) {
    case 'top':
      return { ...base, top: '16px', left: '50%', transform: 'translateX(-50%)' }
    case 'bottom':
      return { ...base, bottom: '16px', left: '50%', transform: 'translateX(-50%)' }
    case 'top-right':
      return { ...base, top: '16px', right: '16px' }
    case 'bottom-right':
    default:
      return { ...base, bottom: '16px', right: '16px' }
  }
}

// ============================================================================
// Export
// ============================================================================

export default SafetySignalConfirmation
