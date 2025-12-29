/**
 * Activation Confirmation Component.
 *
 * Story 6.3: Agreement Activation - AC4
 *
 * Displays confirmation message when agreement is activated.
 * Shows version and effective date with accessible announcements.
 */

'use client'

import { useEffect } from 'react'
import { formatDateFull } from '@/utils/formatDate'

interface ActivationConfirmationProps {
  /** Agreement version (e.g., "v1.0") */
  version: string
  /** Activation timestamp */
  activatedAt: Date
  /** Child's name for personalization */
  childName: string
  /** Family name for personalization */
  familyName?: string
  /** Whether this is shown to the child */
  isChildView?: boolean
  /** Called when user wants to continue */
  onContinue?: () => void
  /** Additional CSS classes */
  className?: string
}

export function ActivationConfirmation({
  version,
  activatedAt,
  childName,
  familyName,
  isChildView = false,
  onContinue,
  className = '',
}: ActivationConfirmationProps) {
  // Announce activation for screen readers (AC4 - accessible)
  useEffect(() => {
    // Create announcement for screen readers
    const announcement = document.createElement('div')
    announcement.setAttribute('role', 'status')
    announcement.setAttribute('aria-live', 'polite')
    announcement.setAttribute('aria-atomic', 'true')
    announcement.className = 'sr-only'
    announcement.textContent = `Congratulations! Your family agreement is now active. Version ${version}, effective ${formatDateFull(activatedAt)}.`
    document.body.appendChild(announcement)

    // Clean up after announcement is read (with safety check for StrictMode)
    return () => {
      if (document.body.contains(announcement)) {
        document.body.removeChild(announcement)
      }
    }
  }, [version, activatedAt])

  return (
    <div
      className={`rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-300 p-8 text-center ${className}`}
      role="region"
      aria-labelledby="activation-heading"
      data-testid="activation-confirmation"
    >
      {/* Celebration icon */}
      <div className="mb-4 text-6xl" aria-hidden="true" data-testid="celebration-icon">
        🎉
      </div>

      {/* Main heading */}
      <h1
        id="activation-heading"
        className="mb-2 text-2xl font-bold text-green-800"
        data-testid="confirmation-heading"
      >
        {isChildView
          ? 'Your Agreement is Ready!'
          : `${familyName || 'Family'} Agreement Activated!`}
      </h1>

      {/* Subheading with version */}
      <p className="mb-6 text-lg text-green-700" data-testid="version-info">
        Version {version} • Effective {formatDateFull(activatedAt)}
      </p>

      {/* Confirmation message */}
      <div className="mb-6 rounded-lg bg-white/60 p-4" data-testid="confirmation-message">
        {isChildView ? (
          <p className="text-gray-700">
            You and your family made this agreement together.
            <br />
            Everyone promised to follow it!
          </p>
        ) : (
          <p className="text-gray-700">
            Your family agreement with {childName} is now active.
            <br />
            Both parties have signed and committed to the terms.
          </p>
        )}
      </div>

      {/* What this means */}
      <div className="mb-6 text-left" data-testid="what-this-means">
        <h2 className="mb-2 font-medium text-green-800">What happens now:</h2>
        <ul className="space-y-2 text-sm text-gray-700" aria-label="Next steps">
          <li className="flex items-start gap-2">
            <span className="text-green-600" aria-hidden="true">
              ✓
            </span>
            <span>
              {isChildView
                ? 'You can see your agreement any time'
                : 'The agreement is visible on your dashboard'}
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-600" aria-hidden="true">
              ✓
            </span>
            <span>
              {isChildView
                ? 'The rules you agreed to are now active'
                : 'All agreed terms are now in effect'}
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-600" aria-hidden="true">
              ✓
            </span>
            <span>
              {isChildView
                ? 'You can ask questions if something is confusing'
                : 'Changes require a new co-creation session and signatures'}
            </span>
          </li>
        </ul>
      </div>

      {/* Continue button */}
      {onContinue && (
        <button
          type="button"
          onClick={onContinue}
          className="
            rounded-full bg-green-600 px-8 py-3
            font-medium text-white text-lg
            transition-colors hover:bg-green-700
            focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2
            min-h-[44px]
          "
          data-testid="continue-button"
        >
          {isChildView ? 'Got It!' : 'Continue to Dashboard'}
        </button>
      )}
    </div>
  )
}
