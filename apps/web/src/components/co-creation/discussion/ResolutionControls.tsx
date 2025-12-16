/**
 * ResolutionControls Component
 *
 * Story 5.4: Negotiation & Discussion Support - Task 5
 *
 * Displays resolution status and allows marking agreement on discussion terms.
 * Both parent and child must agree for a term to be resolved.
 *
 * NFR42: Screen reader accessible
 * NFR43: Full keyboard navigation
 * NFR49: 44x44px touch targets
 */

import { forwardRef, useState, useId, useCallback, useRef, useEffect } from 'react'
import type { SessionContributor, ResolutionStatus } from '@fledgely/contracts'
import {
  getResolutionStatusLabel,
  getResolutionAnnouncement,
  getRemainingAgreement,
} from './discussionUtils'

// ============================================
// TYPES
// ============================================

export interface ResolutionControlsProps {
  /** Term title for announcements */
  termTitle: string
  /** Current resolution status */
  status: ResolutionStatus
  /** The current contributor */
  contributor: SessionContributor
  /** Callback when agreement is marked */
  onMarkAgreement: (contributor: SessionContributor) => void
  /** Whether the controls are disabled */
  disabled?: boolean
  /** Custom className */
  className?: string
  /** Test ID */
  'data-testid'?: string
}

// ============================================
// DEBOUNCE DELAY
// ============================================

const DEBOUNCE_MS = 500

// ============================================
// STATUS BADGE COMPONENT
// ============================================

interface StatusBadgeProps {
  status: ResolutionStatus
}

function StatusBadge({ status }: StatusBadgeProps) {
  const isResolved = status === 'resolved'
  const statusLabel = getResolutionStatusLabel(status)

  const badgeStyles: Record<ResolutionStatus, string> = {
    unresolved: 'bg-amber-100 text-amber-800 border-amber-300',
    'parent-agreed': 'bg-blue-100 text-blue-800 border-blue-300',
    'child-agreed': 'bg-pink-100 text-pink-800 border-pink-300',
    resolved: 'bg-green-100 text-green-800 border-green-300',
  }

  const iconMap: Record<ResolutionStatus, string> = {
    unresolved: '💬',
    'parent-agreed': '👤',
    'child-agreed': '👧',
    resolved: '✓',
  }

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm font-medium ${badgeStyles[status]}`}
      data-testid="resolution-status-badge"
      role="status"
      aria-label={`Resolution status: ${statusLabel}`}
    >
      <span aria-hidden="true">{iconMap[status]}</span>
      <span>{statusLabel}</span>
    </div>
  )
}

// ============================================
// PROGRESS INDICATOR COMPONENT
// ============================================

interface ProgressIndicatorProps {
  status: ResolutionStatus
}

function ProgressIndicator({ status }: ProgressIndicatorProps) {
  const steps = [
    { key: 'parent', label: 'Parent', completed: status === 'parent-agreed' || status === 'resolved' },
    { key: 'child', label: 'Child', completed: status === 'child-agreed' || status === 'resolved' },
  ]

  return (
    <div
      className="flex items-center gap-2"
      data-testid="resolution-progress"
      role="group"
      aria-label="Agreement progress"
    >
      {steps.map((step, index) => (
        <div key={step.key} className="flex items-center">
          {index > 0 && (
            <div
              className={`w-8 h-0.5 mx-1 ${
                steps[0].completed ? 'bg-green-400' : 'bg-gray-300'
              }`}
              aria-hidden="true"
            />
          )}
          <div
            className={`flex items-center justify-center w-8 h-8 rounded-full border-2 text-xs font-medium ${
              step.completed
                ? 'bg-green-100 border-green-400 text-green-700'
                : 'bg-gray-100 border-gray-300 text-gray-500'
            }`}
            data-testid={`progress-${step.key}`}
            aria-label={`${step.label}: ${step.completed ? 'agreed' : 'pending'}`}
          >
            {step.completed ? '✓' : step.key === 'parent' ? 'P' : 'C'}
          </div>
        </div>
      ))}
    </div>
  )
}

// ============================================
// MAIN COMPONENT
// ============================================

export const ResolutionControls = forwardRef<HTMLDivElement, ResolutionControlsProps>(
  function ResolutionControls(
    {
      termTitle,
      status,
      contributor,
      onMarkAgreement,
      disabled = false,
      className = '',
      'data-testid': testId = 'resolution-controls',
    },
    ref
  ) {
    const [isDebouncing, setIsDebouncing] = useState(false)
    const [announcementText, setAnnouncementText] = useState('')
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const titleId = useId()

    const isResolved = status === 'resolved'
    const remainingAgreement = getRemainingAgreement(status)

    // Check if current contributor has already agreed
    const hasCurrentContributorAgreed =
      (contributor === 'parent' && (status === 'parent-agreed' || status === 'resolved')) ||
      (contributor === 'child' && (status === 'child-agreed' || status === 'resolved'))

    // Check if current contributor can mark agreement
    const canMarkAgreement = !isResolved && !hasCurrentContributorAgreed && !disabled && !isDebouncing

    // Cleanup debounce on unmount
    useEffect(() => {
      return () => {
        if (debounceRef.current) {
          clearTimeout(debounceRef.current)
        }
      }
    }, [])

    const handleMarkAgreement = useCallback(() => {
      if (!canMarkAgreement) return

      // Start debounce
      setIsDebouncing(true)

      // Call the callback
      onMarkAgreement(contributor)

      // Announce for screen readers
      // Determine what the new status will be
      let newStatus: ResolutionStatus
      if (status === 'unresolved') {
        newStatus = contributor === 'parent' ? 'parent-agreed' : 'child-agreed'
      } else if (
        (status === 'parent-agreed' && contributor === 'child') ||
        (status === 'child-agreed' && contributor === 'parent')
      ) {
        newStatus = 'resolved'
      } else {
        newStatus = status
      }

      const announcement = getResolutionAnnouncement(termTitle, newStatus)
      setAnnouncementText(announcement)
      setTimeout(() => setAnnouncementText(''), 1000)

      // End debounce after delay
      debounceRef.current = setTimeout(() => {
        setIsDebouncing(false)
      }, DEBOUNCE_MS)
    }, [canMarkAgreement, onMarkAgreement, contributor, status, termTitle])

    const isChild = contributor === 'child'
    const buttonColor = isChild
      ? 'bg-pink-500 hover:bg-pink-600 focus:ring-pink-300'
      : 'bg-blue-500 hover:bg-blue-600 focus:ring-blue-300'

    return (
      <div
        ref={ref}
        className={`resolution-controls ${className}`}
        data-testid={testId}
        role="region"
        aria-labelledby={titleId}
      >
        {/* Screen reader announcement */}
        <div
          aria-live="assertive"
          aria-atomic="true"
          className="sr-only"
          data-testid="resolution-announcement"
        >
          {announcementText}
        </div>

        {/* Header */}
        <h4
          id={titleId}
          className="text-sm font-medium text-gray-700 mb-3 flex items-center"
        >
          <span className="mr-2" aria-hidden="true">✋</span>
          Agreement
        </h4>

        {/* Status and Progress */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <StatusBadge status={status} />
          <ProgressIndicator status={status} />
        </div>

        {/* Resolved State */}
        {isResolved && (
          <div
            className="bg-green-50 rounded-lg p-4 border border-green-200 text-center"
            data-testid="resolved-message"
            role="status"
          >
            <span className="text-2xl mb-2 block" aria-hidden="true">🎉</span>
            <p className="text-green-800 font-medium">
              Both parties agree!
            </p>
            <p className="text-green-600 text-sm mt-1">
              This term is ready for the final agreement.
            </p>
          </div>
        )}

        {/* Waiting for other party */}
        {!isResolved && hasCurrentContributorAgreed && (
          <div
            className="bg-gray-50 rounded-lg p-4 border border-gray-200 text-center"
            data-testid="waiting-message"
            role="status"
          >
            <span className="text-xl mb-2 block" aria-hidden="true">⏳</span>
            <p className="text-gray-700 font-medium">
              You have agreed
            </p>
            <p className="text-gray-500 text-sm mt-1">
              Waiting for {remainingAgreement === 'parent' ? 'parent' : 'your child'} to agree.
            </p>
          </div>
        )}

        {/* Agreement Button */}
        {!isResolved && !hasCurrentContributorAgreed && (
          <div className="space-y-3">
            <p
              className="text-sm text-gray-600 text-center"
              data-testid="instruction-text"
            >
              {remainingAgreement === 'both'
                ? 'Both of you need to agree to this term.'
                : `Waiting for ${remainingAgreement === 'parent' ? 'parent' : 'child'} to agree.`}
            </p>

            <button
              type="button"
              onClick={handleMarkAgreement}
              disabled={!canMarkAgreement}
              className={`w-full py-3 px-6 rounded-lg text-white font-medium
                ${buttonColor}
                min-h-[44px] transition-all
                focus:outline-none focus:ring-2 focus:ring-offset-2
                disabled:opacity-50 disabled:cursor-not-allowed`}
              data-testid="agree-button"
              aria-describedby="agree-button-description"
            >
              {isDebouncing ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin" aria-hidden="true">⏳</span>
                  Processing...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <span aria-hidden="true">✓</span>
                  I agree to this term
                </span>
              )}
            </button>

            <p
              id="agree-button-description"
              className="text-xs text-gray-400 text-center"
            >
              By clicking, you confirm you are happy with this term
            </p>
          </div>
        )}
      </div>
    )
  }
)

// ============================================
// EXPORTS
// ============================================

export type { ResolutionControlsProps }
