/**
 * SignalConfirmationUI Component - Story 7.5.3 Task 4
 *
 * Displays discrete confirmation with child-appropriate language.
 * AC1: Discrete confirmation display
 * AC6: Child-appropriate language (6th-grade reading level)
 * AC7: Analytics for improvement
 *
 * CRITICAL: This component displays to children in crisis.
 * All text must be reassuring, not clinical.
 */

'use client'

import { useEffect, useRef, useId, useCallback } from 'react'
import {
  CONFIRMATION_DEFAULTS,
  type ConfirmationContent,
  type SignalCrisisResource,
} from '@fledgely/shared'

export interface SignalConfirmationUIProps {
  /** Confirmation content to display */
  content: ConfirmationContent
  /** Crisis resources to show */
  resources: SignalCrisisResource[]
  /** Called when user dismisses the confirmation */
  onDismiss: () => void
  /** Called when user clicks a resource */
  onResourceClick?: (resource: SignalCrisisResource) => void
  /** Called when user clicks chat option */
  onChatClick?: () => void
  /** Whether the confirmation is open (default: true) */
  isOpen?: boolean
  /** Whether to show chat option */
  showChatOption?: boolean
  /** Whether device is offline */
  isOffline?: boolean
  /** Additional CSS class */
  className?: string
}

/**
 * Signal Confirmation UI Component
 *
 * A modal dialog that shows confirmation of a safety signal
 * with crisis resources and reassuring messages.
 */
export default function SignalConfirmationUI({
  content,
  resources,
  onDismiss,
  onResourceClick,
  onChatClick,
  isOpen = true,
  showChatOption = false,
  isOffline = false,
  className = '',
}: SignalConfirmationUIProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const dismissButtonRef = useRef<HTMLButtonElement>(null)
  const headerId = useId()
  const bodyId = useId()
  const displayTimeRef = useRef<number>(Date.now())

  // Use ref to avoid recreating event listener when callback changes
  const onDismissRef = useRef(onDismiss)
  useEffect(() => {
    onDismissRef.current = onDismiss
  }, [onDismiss])

  // Focus dismiss button on open and set up auto-dismiss timer (AC3)
  useEffect(() => {
    if (isOpen && dismissButtonRef.current) {
      dismissButtonRef.current.focus()
    }
    displayTimeRef.current = Date.now()

    // AC3: Auto-dismiss after configured timeout (default 30 seconds)
    if (isOpen) {
      const timeoutId = setTimeout(() => {
        onDismissRef.current()
      }, CONFIRMATION_DEFAULTS.AUTO_DISMISS_MS)

      return () => clearTimeout(timeoutId)
    }
  }, [isOpen])

  // Handle escape key (using ref to prevent memory leak)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onDismissRef.current()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  const handleResourceClick = useCallback(
    (resource: SignalCrisisResource) => {
      onResourceClick?.(resource)
    },
    [onResourceClick]
  )

  const handleChatClick = useCallback(() => {
    onChatClick?.()
  }, [onChatClick])

  if (!isOpen) {
    return null
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50 bg-black/50" aria-hidden="true" />
      {/* Dialog */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={headerId}
        aria-describedby={bodyId}
        className={`fixed left-1/2 top-1/2 z-50 mx-4 max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-xl ${className}`}
      >
        {/* Header */}
        <h2 id={headerId} className="mb-4 text-center text-xl font-semibold text-gray-900">
          {content.headerText}
        </h2>

        {/* Body */}
        <p id={bodyId} className="mb-6 text-center text-gray-700">
          {content.bodyText}
        </p>

        {/* Emergency text - prominent display */}
        <div className="mb-6 rounded-lg bg-red-50 p-4 text-center">
          <p className="font-medium text-red-800">{content.emergencyText}</p>
        </div>

        {/* Resources list */}
        {resources.length > 0 && (
          <div className="mb-6 space-y-3">
            {resources.map((resource) => (
              <button
                key={resource.id}
                type="button"
                onClick={() => handleResourceClick(resource)}
                className="w-full rounded-lg border border-gray-200 p-3 text-left transition-colors hover:bg-gray-50"
              >
                <div className="font-medium text-gray-900">{resource.name}</div>
                <div className="text-sm text-gray-600">{resource.description}</div>
              </button>
            ))}
          </div>
        )}

        {/* Chat option */}
        {showChatOption && (
          <button
            type="button"
            onClick={handleChatClick}
            className="mb-4 w-full rounded-lg bg-blue-100 p-3 text-center font-medium text-blue-800 transition-colors hover:bg-blue-200"
          >
            {content.chatPromptText}
          </button>
        )}

        {/* Offline indicator */}
        {isOffline && (
          <div className="mb-4 rounded-lg bg-amber-50 p-3 text-center text-sm text-amber-800">
            You are currently offline. Your message has been saved.
          </div>
        )}

        {/* Dismiss button */}
        <button
          ref={dismissButtonRef}
          type="button"
          onClick={onDismiss}
          className="w-full rounded-lg bg-green-600 py-3 font-medium text-white transition-colors hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
        >
          {content.dismissButtonText}
        </button>
      </div>
    </>
  )
}
