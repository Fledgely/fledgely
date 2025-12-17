'use client'

/**
 * SafetySignalConfirmation
 *
 * Story 7.5.1: Hidden Safety Signal Access - Task 4
 * Story 7.5.3: Signal Confirmation & Resources - Enhanced
 *
 * Discrete confirmation component that shows after a safety signal
 * is triggered. Shows crisis resources and emergency contact info.
 *
 * CRITICAL SAFETY REQUIREMENTS:
 * - Must be discrete - should not draw observer attention (AC3)
 * - Calming over alarming - soft colors, reassuring language
 * - Child-appropriate language (6th-grade reading level)
 * - Dismissible via tap, swipe, or ESC key
 * - No sound or vibration that could alert others
 *
 * CRITICAL INVARIANT (INV-002): Safety signals NEVER visible to family.
 */

import React, { useEffect, useState, useCallback, useRef } from 'react'
import { useSafetySignalContextOptional } from './SafetySignalProvider'
import {
  SIGNAL_CONFIRMATION_CONSTANTS,
  DEFAULT_CONFIRMATION_CONTENT,
  type CrisisResource,
  type SignalConfirmationContent,
  getResourceHref,
} from '@fledgely/contracts'

// ============================================================================
// Types
// ============================================================================

/**
 * SafetySignalConfirmation props
 */
interface SafetySignalConfirmationProps {
  /** Custom confirmation content (uses defaults if not provided) */
  content?: SignalConfirmationContent
  /** Custom CSS class */
  className?: string
  /** Position on screen */
  position?: 'center' | 'top' | 'bottom'
  /** Test ID for testing */
  testId?: string
  /** Whether signal is offline (queued) */
  isOffline?: boolean
  /** Callback when confirmation is dismissed */
  onDismiss?: () => void
  /** Callback when a resource is clicked */
  onResourceClick?: (resource: CrisisResource) => void
  /** Callback when emergency (911) is clicked */
  onEmergencyClick?: () => void
}

// ============================================================================
// Sub-Components
// ============================================================================

/**
 * CrisisResourceLink - A tappable link to a crisis resource
 */
function CrisisResourceLink({
  resource,
  onClick,
}: {
  resource: CrisisResource
  onClick?: (resource: CrisisResource) => void
}) {
  const href = getResourceHref(resource)
  const icon = getResourceIcon(resource.type)

  const handleClick = (e: React.MouseEvent) => {
    // Don't prevent default - let the link work
    onClick?.(resource)
  }

  return (
    <a
      href={href}
      onClick={handleClick}
      target={resource.type === 'web' || resource.type === 'chat' ? '_blank' : undefined}
      rel={resource.type === 'web' || resource.type === 'chat' ? 'noopener noreferrer' : undefined}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 12px',
        marginBottom: '6px',
        borderRadius: '6px',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        color: '#fff',
        textDecoration: 'none',
        fontSize: '0.9rem',
        transition: 'background-color 150ms ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'
      }}
      data-testid={`crisis-resource-${resource.id}`}
    >
      <span style={{ fontSize: '1.1rem' }}>{icon}</span>
      <span style={{ flex: 1 }}>
        <span style={{ display: 'block', fontWeight: 500 }}>{resource.action}</span>
        <span style={{ display: 'block', fontSize: '0.8rem', opacity: 0.8 }}>
          {resource.description}
        </span>
      </span>
    </a>
  )
}

/**
 * EmergencyCallButton - Prominent 911 call button
 */
function EmergencyCallButton({
  message,
  contact,
  onClick,
}: {
  message: string
  contact: string
  onClick?: () => void
}) {
  const handleClick = (e: React.MouseEvent) => {
    // For non-mobile, show confirmation
    if (!/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
      const confirmed = window.confirm(`Call ${contact}?`)
      if (!confirmed) {
        e.preventDefault()
        return
      }
    }
    onClick?.()
  }

  return (
    <a
      href={`tel:${contact}`}
      onClick={handleClick}
      style={{
        display: 'block',
        padding: '10px 16px',
        marginTop: '12px',
        borderRadius: '6px',
        backgroundColor: 'rgba(220, 53, 69, 0.9)',
        color: '#fff',
        textAlign: 'center',
        textDecoration: 'none',
        fontSize: '0.95rem',
        fontWeight: 600,
      }}
      data-testid="emergency-call-button"
    >
      {message}
    </a>
  )
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Get icon for resource type
 */
function getResourceIcon(type: CrisisResource['type']): string {
  switch (type) {
    case 'text':
      return '💬'
    case 'phone':
      return '📞'
    case 'web':
      return '🌐'
    case 'chat':
      return '💭'
    default:
      return '📱'
  }
}

/**
 * Get CSS position styles
 */
function getPositionStyles(position: 'center' | 'top' | 'bottom'): React.CSSProperties {
  const base: React.CSSProperties = {
    position: 'fixed',
    left: '50%',
    transform: 'translateX(-50%)',
  }

  switch (position) {
    case 'top':
      return { ...base, top: '16px' }
    case 'bottom':
      return { ...base, bottom: '16px' }
    case 'center':
    default:
      return { ...base, top: '50%', transform: 'translate(-50%, -50%)' }
  }
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * SafetySignalConfirmation
 *
 * Shows a discrete confirmation when a safety signal is triggered.
 * Includes crisis resources and emergency contact info.
 *
 * @example
 * ```tsx
 * function App() {
 *   return (
 *     <SafetySignalProvider childId={childId}>
 *       <MainContent />
 *       <SafetySignalConfirmation position="center" />
 *     </SafetySignalProvider>
 *   )
 * }
 * ```
 */
export function SafetySignalConfirmation({
  content = DEFAULT_CONFIRMATION_CONTENT,
  className = '',
  position = 'center',
  testId = 'safety-signal-confirmation',
  isOffline: isOfflineProp,
  onDismiss,
  onResourceClick,
  onEmergencyClick,
}: SafetySignalConfirmationProps) {
  const safetySignal = useSafetySignalContextOptional()
  const [visible, setVisible] = useState(false)
  const [fading, setFading] = useState(false)
  const [isOffline, setIsOffline] = useState(isOfflineProp ?? false)
  const [userInteracted, setUserInteracted] = useState(false)
  const dismissTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fadeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Dismiss handler - must be defined before resetTimeout
  const handleDismiss = useCallback(() => {
    setFading(true)
    setTimeout(() => {
      setVisible(false)
      setFading(false)
      setUserInteracted(false)
      onDismiss?.()
    }, SIGNAL_CONFIRMATION_CONSTANTS.FADE_OUT_MS)
  }, [onDismiss])

  // Reset timeout when user interacts
  const resetTimeout = useCallback(
    (forceExtended = false) => {
      if (dismissTimeoutRef.current) {
        clearTimeout(dismissTimeoutRef.current)
      }
      if (fadeTimeoutRef.current) {
        clearTimeout(fadeTimeoutRef.current)
      }

      // Use extended timeout if user has interacted OR if forceExtended is true
      const timeout =
        userInteracted || forceExtended ? content.extendedTimeout : content.dismissTimeout

      fadeTimeoutRef.current = setTimeout(() => {
        setFading(true)
      }, timeout - SIGNAL_CONFIRMATION_CONSTANTS.FADE_OUT_MS)

      dismissTimeoutRef.current = setTimeout(() => {
        handleDismiss()
      }, timeout)
    },
    [content.dismissTimeout, content.extendedTimeout, userInteracted, handleDismiss]
  )

  // Handle user interaction (extend timeout)
  const handleInteraction = useCallback(() => {
    const shouldExtend = !userInteracted && content.extendOnInteraction
    if (shouldExtend) {
      setUserInteracted(true)
    }
    // Pass true to forceExtended when this is the first interaction
    resetTimeout(shouldExtend)
  }, [userInteracted, content.extendOnInteraction, resetTimeout])

  // Handle resource click
  const handleResourceClick = useCallback(
    (resource: CrisisResource) => {
      handleInteraction()
      onResourceClick?.(resource)
    },
    [handleInteraction, onResourceClick]
  )

  // Handle emergency click
  const handleEmergencyClick = useCallback(() => {
    handleInteraction()
    onEmergencyClick?.()
  }, [handleInteraction, onEmergencyClick])

  // Handle keyboard dismiss (ESC)
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && visible) {
        handleDismiss()
      }
    },
    [visible, handleDismiss]
  )

  // Show confirmation when signal is triggered
  useEffect(() => {
    if (safetySignal?.signalTriggered) {
      setVisible(true)
      setFading(false)
      setIsOffline(safetySignal.isOffline ?? isOfflineProp ?? false)
      resetTimeout()
    }
  }, [safetySignal?.signalTriggered, safetySignal?.isOffline, isOfflineProp, resetTimeout])

  // Listen for ESC key
  useEffect(() => {
    if (visible) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [visible, handleKeyDown])

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (dismissTimeoutRef.current) clearTimeout(dismissTimeoutRef.current)
      if (fadeTimeoutRef.current) clearTimeout(fadeTimeoutRef.current)
    }
  }, [])

  // Don't render if not visible
  if (!visible) {
    return null
  }

  const positionStyles = getPositionStyles(position)
  const message = isOffline ? content.offlineMessage : content.message
  const secondaryMessage = isOffline ? content.offlineSecondaryMessage : content.secondaryMessage

  return (
    <>
      {/* Backdrop - click to dismiss */}
      <div
        onClick={handleDismiss}
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 9998,
          opacity: fading ? 0 : 1,
          transition: `opacity ${SIGNAL_CONFIRMATION_CONSTANTS.FADE_OUT_MS}ms ease-out`,
        }}
        data-testid={`${testId}-backdrop`}
      />

      {/* Confirmation panel */}
      <div
        data-testid={testId}
        className={className}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirmation-title"
        style={{
          ...positionStyles,
          width: '90%',
          maxWidth: '320px',
          padding: '20px',
          backgroundColor: 'rgba(55, 65, 81, 0.95)', // Soft gray, not alarming
          color: '#fff',
          borderRadius: '12px',
          zIndex: 9999,
          opacity: fading ? 0 : 1,
          transition: `opacity ${SIGNAL_CONFIRMATION_CONSTANTS.FADE_OUT_MS}ms ease-out`,
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        }}
        onClick={(e) => e.stopPropagation()} // Don't dismiss when clicking inside
      >
        {/* Main message */}
        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <div
            style={{
              fontSize: '1.5rem',
              marginBottom: '8px',
            }}
          >
            ✓
          </div>
          <h2
            id="confirmation-title"
            style={{
              fontSize: '1.1rem',
              fontWeight: 600,
              margin: 0,
              marginBottom: '4px',
            }}
          >
            {message}
          </h2>
          {secondaryMessage && (
            <p
              style={{
                fontSize: '0.9rem',
                margin: 0,
                opacity: 0.9,
              }}
            >
              {secondaryMessage}
            </p>
          )}
        </div>

        {/* Crisis resources */}
        <div style={{ marginBottom: '4px' }}>
          {content.resources.map((resource) => (
            <CrisisResourceLink
              key={resource.id}
              resource={resource}
              onClick={handleResourceClick}
            />
          ))}
        </div>

        {/* Emergency call button */}
        <EmergencyCallButton
          message={content.emergencyMessage}
          contact={content.emergencyContact}
          onClick={handleEmergencyClick}
        />

        {/* Dismiss instruction */}
        <p
          style={{
            textAlign: 'center',
            fontSize: '0.75rem',
            color: 'rgba(255, 255, 255, 0.6)',
            marginTop: '12px',
            marginBottom: 0,
          }}
        >
          {content.dismissInstruction}
        </p>
      </div>
    </>
  )
}

// ============================================================================
// Export
// ============================================================================

export default SafetySignalConfirmation
