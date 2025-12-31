'use client'

/**
 * DemoChildCard Component
 *
 * Story 8.5.1: Demo Child Profile Creation
 * Story 8.5.2: Sample Screenshot Gallery Integration
 * Story 8.5.3: Sample Time Tracking Display Integration
 * Story 8.5.4: Sample Flag & Alert Examples Integration
 * Story 8.5.5: Demo-to-Real Transition
 * Story 8.5.6: Demo for Child Explanation
 *
 * Displays a demo child profile for new parents.
 * Uses distinct visual styling to differentiate from real children.
 *
 * Acceptance Criteria:
 * - AC2: Clear demo label ("Demo - Sample Data")
 * - AC4: Distinct styling (dashed border, different background)
 * - AC5: Dismissible with confirmation
 * - 8.5.2 AC1: Expandable gallery section
 * - 8.5.3 AC1: Time tracking section in demo card
 * - 8.5.4 AC1: Flag review section in demo card
 * - 8.5.5 AC1: Clear "Start with Your Child" CTA
 * - 8.5.6 AC1: Child explanation mode accessible
 */

import { useState } from 'react'
import type { DemoChild } from '../../hooks/useDemo'
import type { DemoActivitySummary, DemoScreenshot } from '../../data/demoData'
import {
  DemoScreenshotGallery,
  DemoTimeTrackingPanel,
  DemoFlagReviewPanel,
  DemoTransitionCTA,
  ChildFriendlyOverlay,
} from './demo'

/**
 * Props for DemoChildCard component
 */
export interface DemoChildCardProps {
  /** The demo child profile */
  demoChild: DemoChild
  /** Activity summary for demo display */
  activitySummary: DemoActivitySummary
  /** Callback when user dismisses demo */
  onDismiss: () => Promise<void>
  /** Whether dismiss is in progress */
  dismissing?: boolean
  /** Callback when user wants to explore demo (navigate to detail view) */
  onExplore?: () => void
  /** Screenshots to display in expandable gallery */
  screenshots?: DemoScreenshot[]
  /** Whether to show inline gallery (default: false) */
  showGallery?: boolean
  /** Whether to show time tracking panel (default: false) */
  showTimeTracking?: boolean
  /** Whether to show flag review panel (default: false) */
  showFlagReview?: boolean
  /** Callback when user clicks "Start with Your Child" (Story 8.5.5) */
  onStartWithRealChild?: () => void
  /** Whether user has explored key demo features (Story 8.5.5) */
  hasExploredDemo?: boolean
  /** Whether start action is in progress (Story 8.5.5) */
  starting?: boolean
  /** Callback when user clicks "Explain to Child" (Story 8.5.6) */
  onExplainToChild?: () => void
  /** Whether child explanation mode is active (Story 8.5.6) */
  isChildExplanationMode?: boolean
  /** Callback when user exits child explanation mode (Story 8.5.6) */
  onExitChildExplanationMode?: () => void
}

/**
 * Calculate age from birthdate
 */
function calculateAge(birthdate: Date): number {
  const today = new Date()
  let age = today.getFullYear() - birthdate.getFullYear()
  const monthDiff = today.getMonth() - birthdate.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthdate.getDate())) {
    age--
  }
  return age
}

/**
 * Demo badge styling constant
 */
const DEMO_BADGE_STYLES: React.CSSProperties = {
  backgroundColor: '#ede9fe',
  color: '#6d28d9',
  fontSize: '11px',
  fontWeight: 600,
  padding: '2px 8px',
  borderRadius: '12px',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '4px',
}

/**
 * DemoChildCard - Demo profile card for new parents
 */
export function DemoChildCard({
  demoChild,
  activitySummary,
  onDismiss,
  dismissing = false,
  onExplore,
  screenshots,
  showGallery: initialShowGallery = false,
  showTimeTracking: initialShowTimeTracking = false,
  showFlagReview: initialShowFlagReview = false,
  onStartWithRealChild,
  hasExploredDemo = false,
  starting = false,
  onExplainToChild,
  isChildExplanationMode = false,
  onExitChildExplanationMode,
}: DemoChildCardProps) {
  const [showDismissConfirm, setShowDismissConfirm] = useState(false)
  const [galleryExpanded, setGalleryExpanded] = useState(initialShowGallery)
  const [timeTrackingExpanded, setTimeTrackingExpanded] = useState(initialShowTimeTracking)
  const [flagReviewExpanded, setFlagReviewExpanded] = useState(initialShowFlagReview)

  const age = calculateAge(demoChild.birthdate)

  // Card styles - distinct from real children
  const cardStyles: React.CSSProperties = {
    backgroundColor: '#faf5ff', // Light purple/lavender
    border: '2px dashed #c4b5fd', // Dashed purple border
    borderRadius: '12px',
    padding: '16px',
    marginBottom: '16px',
    position: 'relative',
  }

  // Demo banner at top
  const bannerStyles: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '12px',
  }

  // Avatar styles (demo-specific)
  const avatarStyles: React.CSSProperties = {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    backgroundColor: '#ddd6fe', // Purple-100
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '20px',
    color: '#7c3aed', // Purple-600
    fontWeight: 600,
    marginRight: '12px',
    flexShrink: 0,
  }

  const contentStyles: React.CSSProperties = {
    display: 'flex',
    alignItems: 'flex-start',
    marginBottom: '12px',
  }

  const infoStyles: React.CSSProperties = {
    flex: 1,
  }

  const nameStyles: React.CSSProperties = {
    fontSize: '16px',
    fontWeight: 600,
    color: '#1f2937',
    marginBottom: '2px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  }

  const ageStyles: React.CSSProperties = {
    fontSize: '13px',
    color: '#6b7280',
  }

  // Status message styles
  const statusStyles: React.CSSProperties = {
    backgroundColor: '#f0fdf4', // Green-50
    border: '1px solid #bbf7d0', // Green-200
    borderRadius: '8px',
    padding: '10px 12px',
    marginBottom: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  }

  const buttonContainerStyles: React.CSSProperties = {
    display: 'flex',
    gap: '8px',
    marginTop: '12px',
  }

  const primaryButtonStyles: React.CSSProperties = {
    flex: 1,
    padding: '10px 16px',
    backgroundColor: '#7c3aed', // Purple-600
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
  }

  const secondaryButtonStyles: React.CSSProperties = {
    flex: 1,
    padding: '10px 16px',
    backgroundColor: 'transparent',
    color: '#6b7280',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: dismissing ? 'wait' : 'pointer',
    opacity: dismissing ? 0.5 : 1,
  }

  const confirmOverlayStyles: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: '12px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
  }

  const handleDismissClick = () => {
    setShowDismissConfirm(true)
  }

  const handleConfirmDismiss = async () => {
    await onDismiss()
    setShowDismissConfirm(false)
  }

  const handleCancelDismiss = () => {
    setShowDismissConfirm(false)
  }

  return (
    <div style={cardStyles} data-testid="demo-child-card">
      {/* Demo Banner */}
      <div style={bannerStyles}>
        <div style={DEMO_BADGE_STYLES} data-testid="demo-badge">
          <span aria-hidden="true">🎭</span>
          <span>Demo - Sample Data</span>
        </div>
      </div>

      {/* Child Info */}
      <div style={contentStyles}>
        <div style={avatarStyles} aria-hidden="true">
          AD
        </div>
        <div style={infoStyles}>
          <div style={nameStyles}>
            <span>{demoChild.name}</span>
          </div>
          <div style={ageStyles}>{age} years old</div>
        </div>
      </div>

      {/* Status Message */}
      <div style={statusStyles} data-testid="demo-status">
        <span style={{ color: '#22c55e' }} aria-hidden="true">
          ✓
        </span>
        <span style={{ fontSize: '13px', color: '#166534' }}>
          All Good - This is sample data showing how monitoring would appear
        </span>
      </div>

      {/* Activity Summary */}
      <div
        style={{
          fontSize: '13px',
          color: '#6b7280',
          marginBottom: '8px',
        }}
        data-testid="demo-activity-summary"
      >
        <span style={{ fontWeight: 500 }}>{activitySummary.totalScreenshots}</span> sample
        screenshots over <span style={{ fontWeight: 500 }}>{activitySummary.daysWithActivity}</span>{' '}
        days
      </div>

      {/* Buttons */}
      <div style={buttonContainerStyles}>
        {/* Show inline toggle if screenshots provided, otherwise show navigate button */}
        {screenshots && screenshots.length > 0 ? (
          <button
            type="button"
            style={primaryButtonStyles}
            onClick={() => setGalleryExpanded(!galleryExpanded)}
            data-testid="toggle-gallery-button"
          >
            {galleryExpanded ? 'Hide Gallery' : 'Explore Demo'}
          </button>
        ) : (
          onExplore && (
            <button
              type="button"
              style={primaryButtonStyles}
              onClick={onExplore}
              data-testid="explore-demo-button"
            >
              Explore Demo
            </button>
          )
        )}
        <button
          type="button"
          style={secondaryButtonStyles}
          onClick={handleDismissClick}
          disabled={dismissing}
          data-testid="dismiss-demo-button"
        >
          {dismissing ? 'Dismissing...' : 'Dismiss Demo'}
        </button>
      </div>

      {/* Expandable Gallery Section - Story 8.5.2, 8.5.6 */}
      {screenshots && screenshots.length > 0 && galleryExpanded && (
        <div data-testid="gallery-section" style={{ marginTop: '16px' }}>
          {isChildExplanationMode && onExitChildExplanationMode ? (
            <ChildFriendlyOverlay
              section="screenshots"
              onExitChildMode={onExitChildExplanationMode}
            >
              <DemoScreenshotGallery screenshots={screenshots} />
            </ChildFriendlyOverlay>
          ) : (
            <DemoScreenshotGallery screenshots={screenshots} />
          )}
        </div>
      )}

      {/* Time Tracking Toggle Button - Story 8.5.3 */}
      <div style={{ marginTop: '12px' }}>
        <button
          type="button"
          onClick={() => setTimeTrackingExpanded(!timeTrackingExpanded)}
          data-testid="toggle-time-tracking-button"
          style={{
            width: '100%',
            padding: '10px 16px',
            backgroundColor: timeTrackingExpanded ? '#f3e8ff' : '#faf5ff',
            color: '#7c3aed',
            border: '1px dashed #c4b5fd',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
          }}
        >
          <span>📊</span>
          <span>{timeTrackingExpanded ? 'Hide Time Tracking' : 'View Time Tracking'}</span>
        </button>
      </div>

      {/* Expandable Time Tracking Section - Story 8.5.3, 8.5.6 */}
      {timeTrackingExpanded && (
        <div data-testid="time-tracking-section" style={{ marginTop: '16px' }}>
          {isChildExplanationMode && onExitChildExplanationMode ? (
            <ChildFriendlyOverlay
              section="time-tracking"
              onExitChildMode={onExitChildExplanationMode}
            >
              <DemoTimeTrackingPanel />
            </ChildFriendlyOverlay>
          ) : (
            <DemoTimeTrackingPanel />
          )}
        </div>
      )}

      {/* Flag Review Toggle Button - Story 8.5.4 */}
      <div style={{ marginTop: '12px' }}>
        <button
          type="button"
          onClick={() => setFlagReviewExpanded(!flagReviewExpanded)}
          data-testid="toggle-flag-review-button"
          style={{
            width: '100%',
            padding: '10px 16px',
            backgroundColor: flagReviewExpanded ? '#fef3c7' : '#faf5ff',
            color: flagReviewExpanded ? '#92400e' : '#7c3aed',
            border: `1px dashed ${flagReviewExpanded ? '#fbbf24' : '#c4b5fd'}`,
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
          }}
        >
          <span>🚩</span>
          <span>{flagReviewExpanded ? 'Hide Flag Review' : 'View Flagged Content'}</span>
        </button>
      </div>

      {/* Expandable Flag Review Section - Story 8.5.4, 8.5.6 */}
      {flagReviewExpanded && (
        <div data-testid="flag-review-section" style={{ marginTop: '16px' }}>
          {isChildExplanationMode && onExitChildExplanationMode ? (
            <ChildFriendlyOverlay section="flags" onExitChildMode={onExitChildExplanationMode}>
              <DemoFlagReviewPanel />
            </ChildFriendlyOverlay>
          ) : (
            <DemoFlagReviewPanel />
          )}
        </div>
      )}

      {/* Explain to Child Button - Story 8.5.6 */}
      {onExplainToChild && (
        <div style={{ marginTop: '12px' }}>
          <button
            type="button"
            onClick={onExplainToChild}
            data-testid="explain-to-child-button"
            style={{
              width: '100%',
              padding: '10px 16px',
              backgroundColor: isChildExplanationMode ? '#a78bfa' : '#faf5ff',
              color: isChildExplanationMode ? 'white' : '#7c3aed',
              border: '1px dashed #c4b5fd',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            <span aria-hidden="true">👨‍👧</span>
            <span>{isChildExplanationMode ? 'Exit Child Explanation' : 'Explain to Child'}</span>
          </button>
        </div>
      )}

      {/* Transition CTA - Story 8.5.5 */}
      {onStartWithRealChild && (
        <DemoTransitionCTA
          onStartWithRealChild={onStartWithRealChild}
          hasExploredDemo={hasExploredDemo}
          starting={starting}
        />
      )}

      {/* Dismiss Confirmation Overlay */}
      {showDismissConfirm && (
        <div style={confirmOverlayStyles} data-testid="dismiss-confirm">
          <p
            style={{
              fontSize: '15px',
              fontWeight: 500,
              color: '#1f2937',
              textAlign: 'center',
              marginBottom: '16px',
            }}
          >
            Dismiss demo profile?
          </p>
          <p
            style={{
              fontSize: '13px',
              color: '#6b7280',
              textAlign: 'center',
              marginBottom: '20px',
            }}
          >
            You can always see how monitoring works by adding a real child.
          </p>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              type="button"
              style={{
                ...secondaryButtonStyles,
                flex: 'none',
                width: '100px',
              }}
              onClick={handleCancelDismiss}
              data-testid="dismiss-cancel-button"
            >
              Cancel
            </button>
            <button
              type="button"
              style={{
                ...primaryButtonStyles,
                flex: 'none',
                width: '100px',
                backgroundColor: '#ef4444', // Red for dismiss
              }}
              onClick={handleConfirmDismiss}
              disabled={dismissing}
              data-testid="dismiss-confirm-button"
            >
              {dismissing ? 'Dismissing...' : 'Dismiss'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
