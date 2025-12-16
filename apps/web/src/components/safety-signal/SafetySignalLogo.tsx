'use client'

/**
 * SafetySignalLogo
 *
 * Story 7.5.1: Hidden Safety Signal Access - Task 4
 *
 * Logo component with integrated safety signal tap detection.
 * Appears as a normal logo but secretly tracks tap patterns.
 *
 * CRITICAL SAFETY REQUIREMENTS:
 * - No visual feedback during tap detection (AC3)
 * - Normal logo appearance at all times
 * - Works with mouse clicks and touch events
 *
 * CRITICAL INVARIANT (INV-002): Safety signals NEVER visible to family.
 */

import React, { type ReactNode, type CSSProperties } from 'react'
import { useSafetySignalContextOptional } from './SafetySignalProvider'

// ============================================================================
// Types
// ============================================================================

/**
 * SafetySignalLogo props
 */
interface SafetySignalLogoProps {
  /** Logo content (image, SVG, or text) */
  children?: ReactNode
  /** Optional className for styling */
  className?: string
  /** Optional inline styles */
  style?: CSSProperties
  /** Custom onClick handler (will be called AFTER signal detection) */
  onClick?: () => void
  /** Accessible label for the logo */
  ariaLabel?: string
  /** Whether to render as button (default: true for accessibility) */
  asButton?: boolean
  /** Test ID for testing */
  testId?: string
}

// ============================================================================
// Component
// ============================================================================

/**
 * SafetySignalLogo
 *
 * A logo component that integrates with SafetySignalProvider for
 * hidden gesture detection. Use this instead of a plain logo image
 * in areas where children need safety signal access.
 *
 * @example
 * ```tsx
 * function Header() {
 *   return (
 *     <header>
 *       <SafetySignalLogo ariaLabel="Fledgely Home">
 *         <img src="/logo.svg" alt="" />
 *       </SafetySignalLogo>
 *     </header>
 *   )
 * }
 * ```
 */
export function SafetySignalLogo({
  children,
  className,
  style,
  onClick,
  ariaLabel = 'Fledgely',
  asButton = true,
  testId = 'safety-signal-logo',
}: SafetySignalLogoProps) {
  // Get safety signal context (optional - works outside provider too)
  const safetySignal = useSafetySignalContextOptional()

  /**
   * Handle tap/click event
   *
   * CRITICAL: Register tap with safety signal FIRST, then call user onClick
   */
  const handleClick = () => {
    // Register tap with safety signal system
    if (safetySignal) {
      safetySignal.onLogoTap()
    }

    // Call user's onClick handler
    if (onClick) {
      onClick()
    }
  }

  // Common props
  const commonProps = {
    className,
    style,
    onClick: handleClick,
    'data-testid': testId,
  }

  // Render as button for better accessibility
  if (asButton) {
    return (
      <button
        {...commonProps}
        type="button"
        aria-label={ariaLabel}
        // Remove default button styles
        style={{
          ...style,
          background: 'none',
          border: 'none',
          padding: 0,
          cursor: 'pointer',
        }}
      >
        {children ?? <DefaultLogo />}
      </button>
    )
  }

  // Render as div if not interactive
  return (
    <div {...commonProps} role="img" aria-label={ariaLabel}>
      {children ?? <DefaultLogo />}
    </div>
  )
}

// ============================================================================
// Default Logo
// ============================================================================

/**
 * Default Fledgely logo placeholder
 *
 * Used when no children are provided. Replace with actual logo in production.
 */
function DefaultLogo() {
  return (
    <span
      style={{
        fontWeight: 'bold',
        fontSize: '1.25rem',
        color: 'var(--primary, #000)',
      }}
    >
      Fledgely
    </span>
  )
}

// ============================================================================
// Export
// ============================================================================

export default SafetySignalLogo
